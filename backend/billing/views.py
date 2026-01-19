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
from core.mixins import TenantScopedQuerysetMixin

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust as needed

class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all()
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-issued_date')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        
        # Calculate totals safely
        revenue_agg = Payment.objects.filter(tenant=tenant).aggregate(total=Sum('amount'))
        total_revenue = revenue_agg['total'] or 0
        
        # Pending calculation: Sum(amount_due) - Sum(amount_paid) for unpaid/partial
        pending_fees = StudentFee.objects.filter(
            tenant=tenant,
            status__in=['pending', 'partial']
        )
        total_due = pending_fees.aggregate(total=Sum('amount_due'))['total'] or 0
        total_paid_against_pending = pending_fees.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_pending = max(0, total_due - total_paid_against_pending)
        
        expense_agg = Expense.objects.filter(tenant=tenant).aggregate(total=Sum('amount'))
        total_expenses = expense_agg['total'] or 0
        
        # Recent activity
        recent_payments = Payment.objects.filter(tenant=tenant).select_related('student__user').order_by('-payment_date')[:5]
        recent_expenses = Expense.objects.filter(tenant=tenant).order_by('-date')[:5]
        
        return Response({
            'total_revenue': float(total_revenue),
            'total_pending': float(total_pending),
            'total_expenses': float(total_expenses),
            'net_balance': float(total_revenue - total_expenses),
            'recent_payments': PaymentSerializer(recent_payments, many=True).data,
            'recent_expenses': ExpenseSerializer(recent_expenses, many=True).data,
        })
