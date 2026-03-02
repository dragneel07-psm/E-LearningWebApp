from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from datetime import date
from .models import Subscription, SubscriptionPlan, Invoice, FeeStructure, StudentFee, Payment, Expense
from .serializers import (
    SubscriptionSerializer, SubscriptionPlanSerializer, InvoiceSerializer,
    FeeStructureSerializer, StudentFeeSerializer, PaymentSerializer, ExpenseSerializer
)
from .plan_defaults import upsert_default_plans
from core.mixins import TenantScopedQuerysetMixin
from core.reports import generate_pdf_response
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import io

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust as needed

    @action(detail=False, methods=['post'], url_path='seed-defaults')
    def seed_defaults(self, request):
        role = (getattr(request.user, 'role', '') or '').lower()
        if not (request.user.is_superuser or request.user.is_staff or role == 'saas_admin'):
            return Response(
                {'error': 'Only SaaS administrators can seed default plans.'},
                status=status.HTTP_403_FORBIDDEN
            )

        result = upsert_default_plans()
        serializer = self.get_serializer(result['plans'], many=True)
        return Response({
            'message': 'Default subscription plans are ready.',
            'created': result['created'],
            'updated': result['updated'],
            'rate_used': result['rate_used'],
            'used_fallback': result['used_fallback'],
            'plans': serializer.data,
        }, status=status.HTTP_200_OK)

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-issued_date')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Generates and downloads a professional PDF invoice.
        """
        try:
            invoice = self.get_object()
            
            context = {
                'invoice': invoice,
                'platform_name': 'Antigravity SaaS',
                'current_year': timezone.now().year,
            }
            
            filename = f"invoice_{invoice.invoice_id[:12]}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response = generate_pdf_response('reports/invoice.html', context, filename)
            
            if response:
                return response
            return Response({"error": "PDF engine failure"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ==========================================
# SCHOOL FINANCE VIEWSETS
# ==========================================

class FeeStructureViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [permissions.IsAuthenticated]

class StudentFeeViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related('student', 'fee_structure')
    
    @action(detail=False, methods=['post'])
    def assign_bulk(self, request):
        """
        Assign a fee structure to all students in a class.
        Expects: fee_structure_id, academic_class_id, due_date
        """
        fee_structure_id = request.data.get('fee_structure_id')
        academic_class_id = request.data.get('academic_class_id')
        due_date = request.data.get('due_date')
        
        if not all([fee_structure_id, academic_class_id, due_date]):
            return Response({'error': 'Missing required fields: fee_structure_id, academic_class_id, and due_date are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from academic.models import Student
            from django.db import transaction
            
            tenant = getattr(request.user, 'tenant', None)
            if not tenant:
                return Response({'error': 'User has no associated tenant'}, status=status.HTTP_400_BAD_REQUEST)

            fee_structure = FeeStructure.objects.get(fee_id=fee_structure_id, tenant=tenant)
            students = Student.objects.filter(academic_class_id=academic_class_id, user__tenant=tenant)
            
            if not students.exists():
                return Response({'error': 'No students found in the selected class'}, status=status.HTTP_404_NOT_FOUND)

            with transaction.atomic():
                created_count = 0
                for student in students:
                    # Avoid duplicate assignment for same structure and student if pending?
                    # For now, just create as requested.
                    StudentFee.objects.create(
                        tenant=tenant,
                        student=student,
                        fee_structure=fee_structure,
                        amount_due=fee_structure.amount,
                        due_date=due_date,
                        status='pending'
                    )
                    created_count += 1
            
            return Response({'message': f'Successfully assigned fee to {created_count} students'}, status=status.HTTP_201_CREATED)
        except FeeStructure.DoesNotExist:
            return Response({'error': 'Fee structure not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'Assignment failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class PaymentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related('student', 'recorded_by')
    
    def perform_create(self, serializer):
        # Auto-set recorded_by and tenant
        payment = serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user
        )
        
        # Update StudentFee if linked
        if payment.student_fee:
            student_fee = payment.student_fee
            student_fee.amount_paid += payment.amount
            
            # Update status
            if student_fee.amount_paid >= student_fee.amount_due:
                student_fee.status = 'paid'
            elif student_fee.amount_paid > 0:
                student_fee.status = 'partial'
            
            student_fee.save()

    @action(detail=True, methods=['get'])
    def generate_receipt(self, request, pk=None):
        payment = self.get_object()
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Header
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, height - 80, f"PAYMENT RECEIPT")
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 100, f"School: {payment.tenant.name}")
        p.drawString(100, height - 120, f"Date: {payment.payment_date.strftime('%Y-%m-%d %H:%M')}")
        p.drawString(100, height - 140, f"Receipt No: REC-{str(payment.payment_id)[:8]}")
        
        p.line(100, height - 150, width - 100, height - 150)

        # Body
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, height - 180, "Student Details")
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 200, f"Name: {payment.student.user.get_full_name()}")
        p.drawString(100, height - 220, f"Student ID: {payment.student.student_id}")
        
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, height - 260, "Payment Details")
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 280, f"Fee Title: {payment.student_fee.fee_structure.name if payment.student_fee else 'General Fee'}")
        p.setFont("Helvetica-Bold", 14)
        p.drawString(100, height - 310, f"Amount Paid: ${payment.amount}")
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 330, f"Method: {payment.method.capitalize()}")
        p.drawString(100, height - 350, f"Transaction ID: {payment.transaction_id or 'N/A'}")
        
        p.line(100, height - 380, width - 100, height - 380)
        
        # Footer
        p.setFont("Helvetica-Oblique", 10)
        p.drawString(100, height - 400, "This is a computer generated receipt.")
        p.drawString(100, height - 415, f"Recorded by: {payment.recorded_by.get_full_name() if payment.recorded_by else 'Admin'}")

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt_{payment.payment_id}.pdf"'
        return response

class ExpenseViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.order_by('-date')
    
    def perform_create(self, serializer):
        serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user
        )

class FinanceDashboardViewSet(viewsets.ViewSet):
    """
    Provides aggregate financial statistics
    """
    permission_classes = [permissions.IsAuthenticated]
    
    permission_classes = [permissions.IsAuthenticated]
    
    @method_decorator(cache_page(60 * 5)) # Cache for 5 minutes
    def list(self, request):
        user = request.user
        tenant = getattr(user, 'tenant', None)
        if not tenant:
            # Fallback for local dev/testing
            tenant = getattr(request, 'tenant', None)
            
        if not tenant:
            # If no tenant context is identified, return empty stats instead of a 400 error
            # This ensures the dashboard can still render for superusers or misconfigured profiles.
            return Response({
                'total_revenue': 0.0,
                'total_pending': 0.0,
                'total_expenses': 0.0,
                'net_balance': 0.0,
                'recent_payments': [],
                'recent_expenses': [],
                'notice': 'No school tenant identified for this session. Showing summary only.'
            })
        
        # Date Filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        payments_qs = Payment.objects.filter(tenant=tenant)
        expenses_qs = Expense.objects.filter(tenant=tenant)

        if start_date:
            payments_qs = payments_qs.filter(payment_date__date__gte=start_date)
            expenses_qs = expenses_qs.filter(date__gte=start_date)
        if end_date:
            payments_qs = payments_qs.filter(payment_date__date__lte=end_date)
            expenses_qs = expenses_qs.filter(date__lte=end_date)

        # Calculate totals safely
        revenue_agg = payments_qs.aggregate(total=Sum('amount'))
        total_revenue = revenue_agg['total'] or 0
        
        # Pending calculation check (Pending is usually point-in-time, date filtering might mean "fees due in this range"?)
        # For simplicity, pending is usually 'current status', so we might not strict filter by date unless 'due_date' is in range.
        # Let's Apply date filter to due_date for pending fees
        pending_fees_qs = StudentFee.objects.filter(
            tenant=tenant,
            status__in=['pending', 'partial', 'overdue']
        )
        if start_date:
            pending_fees_qs = pending_fees_qs.filter(due_date__gte=start_date)
        if end_date:
            pending_fees_qs = pending_fees_qs.filter(due_date__lte=end_date)

        total_due = pending_fees_qs.aggregate(total=Sum('amount_due'))['total'] or 0
        total_paid_against_pending = pending_fees_qs.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_pending = max(0, total_due - total_paid_against_pending)
        
        expense_agg = expenses_qs.aggregate(total=Sum('amount'))
        total_expenses = expense_agg['total'] or 0
        
        # Recent activity
        recent_payments = Payment.objects.filter(tenant=tenant).select_related('student__user', 'student_fee__fee_structure').order_by('-payment_date')[:5]
        recent_expenses = Expense.objects.filter(tenant=tenant).order_by('-date')[:5]
        
        return Response({
            'total_revenue': float(total_revenue),
            'total_pending': float(total_pending),
            'total_expenses': float(total_expenses),
            'net_balance': float(total_revenue - total_expenses),
            'recent_payments': PaymentSerializer(recent_payments, many=True).data,
            'recent_expenses': ExpenseSerializer(recent_expenses, many=True).data,
        })
