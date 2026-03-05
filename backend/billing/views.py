from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Sum, Q
from datetime import date
from .models import Subscription, SubscriptionPlan, SubscriptionPlanHistory, Invoice, FeeStructure, StudentFee, Payment, Expense
from .serializers import (
    SubscriptionSerializer, SubscriptionPlanSerializer, SubscriptionPlanHistorySerializer, InvoiceSerializer,
    FeeStructureSerializer, StudentFeeSerializer, PaymentSerializer, ExpenseSerializer
)
from .plan_defaults import upsert_default_plans
from core.mixins import TenantScopedQuerysetMixin
from core.reports import generate_pdf_response
from .permissions import IsSaaSAdminUser, IsSchoolFinanceManager
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
import io
from core.utils.plan_enforcement import (
    sync_subscription_limits_with_plan,
    sync_tenant_with_plan,
    build_plan_snapshot,
    record_subscription_plan_history,
)
from core.utils.audit import record_audit_event


class BillingSchemaGuardMixin:
    require_public_schema = False
    require_tenant_schema = False

    def _schema_name(self, request):
        tenant = getattr(request, "tenant", None)
        return getattr(tenant, "schema_name", "public") if tenant else "public"

    def _request_tenant(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant and getattr(tenant, "schema_name", "public") != "public":
            return tenant
        return None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        schema_name = self._schema_name(request)
        user_tenant = getattr(request.user, "tenant", None)
        request_tenant = self._request_tenant(request)

        if self.require_public_schema and schema_name != "public":
            raise PermissionDenied("This endpoint is available only on the public schema.")

        if self.require_tenant_schema:
            if schema_name == "public":
                raise PermissionDenied("This endpoint requires a school tenant schema.")
            if not user_tenant:
                raise PermissionDenied("Authenticated user is not associated with a tenant.")
            if request_tenant and user_tenant != request_tenant:
                raise PermissionDenied("Cross-tenant access denied.")


class SubscriptionPlanViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsSaaSAdminUser]

    def get_permissions(self):
        if self.action == "public":
            return [permissions.AllowAny()]
        return super().get_permissions()

    def perform_update(self, serializer):
        previous_plan_state = SubscriptionPlan.objects.get(pk=serializer.instance.pk)
        previous_plan_snapshot = build_plan_snapshot(previous_plan_state)
        plan = serializer.save()
        new_plan_snapshot = build_plan_snapshot(plan)
        subscriptions = Subscription.objects.filter(plan=plan).select_related('tenant')
        for subscription in subscriptions:
            sync_subscription_limits_with_plan(subscription, plan=plan, save=True)
            sync_tenant_with_plan(subscription.tenant, plan=plan, save=True)
            record_subscription_plan_history(
                subscription,
                previous_plan=previous_plan_state,
                previous_status=subscription.status,
                previous_billing_cycle=subscription.billing_cycle,
                reason='Plan definition updated',
                changed_by=getattr(self.request, 'user', None),
                previous_plan_snapshot=previous_plan_snapshot,
                new_plan_snapshot=new_plan_snapshot,
            )
        record_audit_event(
            action="billing.subscription_plan_definition_updated",
            user=self.request.user,
            request=self.request,
            details={
                "plan_id": str(plan.plan_id),
                "plan_name": plan.name,
                "before": previous_plan_snapshot,
                "after": new_plan_snapshot,
            },
        )

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

    @action(detail=False, methods=['get'], url_path='public', permission_classes=[permissions.AllowAny])
    def public(self, request):
        queryset = SubscriptionPlan.objects.filter(is_active=True).order_by('price_monthly', 'name')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SubscriptionViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = Subscription.objects.select_related('tenant', 'plan').all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSaaSAdminUser]

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        subscription = self.get_object()
        history = subscription.plan_history.select_related('tenant', 'subscription', 'previous_plan', 'new_plan', 'changed_by').all()
        page = self.paginate_queryset(history)
        if page is not None:
            serializer = SubscriptionPlanHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SubscriptionPlanHistorySerializer(history, many=True)
        return Response(serializer.data)


class SubscriptionPlanHistoryViewSet(BillingSchemaGuardMixin, viewsets.ReadOnlyModelViewSet):
    require_public_schema = True
    queryset = SubscriptionPlanHistory.objects.select_related(
        'tenant', 'subscription', 'previous_plan', 'new_plan', 'changed_by'
    ).all()
    serializer_class = SubscriptionPlanHistorySerializer
    permission_classes = [IsSaaSAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        tenant_id = self.request.query_params.get('tenant_id')
        subscription_id = self.request.query_params.get('subscription_id')

        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        return queryset

class InvoiceViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = Invoice.objects.all().order_by('-issued_date')
    serializer_class = InvoiceSerializer
    permission_classes = [IsSaaSAdminUser]

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
            
            filename = f"invoice_{str(invoice.invoice_id)[:12]}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response = generate_pdf_response('reports/invoice.html', context, filename)
            
            if response:
                record_audit_event(
                    action="billing.invoice_downloaded",
                    user=request.user,
                    request=request,
                    details={
                        "invoice_id": str(invoice.invoice_id),
                        "tenant_id": str(invoice.tenant_id),
                        "status": invoice.status,
                        "amount": str(invoice.amount),
                    },
                )
                return response
            return Response({"error": "PDF engine failure"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# ==========================================
# SCHOOL FINANCE VIEWSETS
# ==========================================

class FeeStructureViewSet(BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer
    permission_classes = [IsSchoolFinanceManager]

    def perform_create(self, serializer):
        item = serializer.save(tenant=self.request.user.tenant)
        record_audit_event(
            action="billing.fee_structure_created",
            user=self.request.user,
            request=self.request,
            details={
                "fee_id": str(item.fee_id),
                "name": item.name,
                "amount": str(item.amount),
                "frequency": item.frequency,
                "academic_class_id": item.academic_class_id,
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "name": before.name,
            "amount": str(before.amount),
            "frequency": before.frequency,
            "academic_class_id": before.academic_class_id,
        }
        item = serializer.save()
        record_audit_event(
            action="billing.fee_structure_updated",
            user=self.request.user,
            request=self.request,
            details={
                "fee_id": str(item.fee_id),
                "before": before_snapshot,
                "after": {
                    "name": item.name,
                    "amount": str(item.amount),
                    "frequency": item.frequency,
                    "academic_class_id": item.academic_class_id,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "fee_id": str(instance.fee_id),
            "name": instance.name,
            "amount": str(instance.amount),
            "frequency": instance.frequency,
            "academic_class_id": instance.academic_class_id,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.fee_structure_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )

class StudentFeeViewSet(BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related('student', 'fee_structure')

    def perform_create(self, serializer):
        item = serializer.save(tenant=self.request.user.tenant)
        record_audit_event(
            action="billing.student_fee_created",
            user=self.request.user,
            request=self.request,
            details={
                "student_fee_id": str(item.student_fee_id),
                "student_id": str(item.student_id),
                "fee_id": str(item.fee_structure_id),
                "amount_due": str(item.amount_due),
                "due_date": item.due_date,
                "status": item.status,
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "amount_due": str(before.amount_due),
            "amount_paid": str(before.amount_paid),
            "due_date": before.due_date,
            "status": before.status,
        }
        item = serializer.save()
        record_audit_event(
            action="billing.student_fee_updated",
            user=self.request.user,
            request=self.request,
            details={
                "student_fee_id": str(item.student_fee_id),
                "student_id": str(item.student_id),
                "fee_id": str(item.fee_structure_id),
                "before": before_snapshot,
                "after": {
                    "amount_due": str(item.amount_due),
                    "amount_paid": str(item.amount_paid),
                    "due_date": item.due_date,
                    "status": item.status,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "student_fee_id": str(instance.student_fee_id),
            "student_id": str(instance.student_id),
            "fee_id": str(instance.fee_structure_id),
            "amount_due": str(instance.amount_due),
            "amount_paid": str(instance.amount_paid),
            "status": instance.status,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.student_fee_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )
    
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
            record_audit_event(
                action="billing.student_fee_bulk_assigned",
                user=request.user,
                request=request,
                details={
                    "fee_structure_id": str(fee_structure_id),
                    "academic_class_id": str(academic_class_id),
                    "created_count": created_count,
                    "due_date": due_date,
                },
            )
            
            return Response({'message': f'Successfully assigned fee to {created_count} students'}, status=status.HTTP_201_CREATED)
        except FeeStructure.DoesNotExist:
            return Response({'error': 'Fee structure not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'Assignment failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class PaymentViewSet(BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related('student', 'recorded_by')
    
    def perform_create(self, serializer):
        if not getattr(self.request.user, "tenant", None):
            raise PermissionDenied("Authenticated user is not associated with a tenant.")
        # Auto-set recorded_by and tenant
        payment = serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user
        )
        fee_before = None
        if payment.student_fee:
            fee_before = {
                "student_fee_id": str(payment.student_fee.student_fee_id),
                "amount_paid": str(payment.student_fee.amount_paid),
                "status": payment.student_fee.status,
            }
        
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

        record_audit_event(
            action="billing.payment_created",
            user=self.request.user,
            request=self.request,
            details={
                "payment_id": str(payment.payment_id),
                "student_id": str(payment.student_id),
                "student_fee_id": str(payment.student_fee_id) if payment.student_fee_id else None,
                "amount": str(payment.amount),
                "method": payment.method,
                "transaction_id": payment.transaction_id,
                "student_fee_before": fee_before,
                "student_fee_after": (
                    {
                        "student_fee_id": str(payment.student_fee.student_fee_id),
                        "amount_paid": str(payment.student_fee.amount_paid),
                        "status": payment.student_fee.status,
                    }
                    if payment.student_fee
                    else None
                ),
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "amount": str(before.amount),
            "method": before.method,
            "transaction_id": before.transaction_id,
            "remarks": before.remarks,
        }
        payment = serializer.save()
        record_audit_event(
            action="billing.payment_updated",
            user=self.request.user,
            request=self.request,
            details={
                "payment_id": str(payment.payment_id),
                "student_id": str(payment.student_id),
                "student_fee_id": str(payment.student_fee_id) if payment.student_fee_id else None,
                "before": before_snapshot,
                "after": {
                    "amount": str(payment.amount),
                    "method": payment.method,
                    "transaction_id": payment.transaction_id,
                    "remarks": payment.remarks,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "payment_id": str(instance.payment_id),
            "student_id": str(instance.student_id),
            "student_fee_id": str(instance.student_fee_id) if instance.student_fee_id else None,
            "amount": str(instance.amount),
            "method": instance.method,
            "transaction_id": instance.transaction_id,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.payment_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )

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
        record_audit_event(
            action="billing.payment_receipt_downloaded",
            user=request.user,
            request=request,
            details={
                "payment_id": str(payment.payment_id),
                "student_id": str(payment.student_id),
                "amount": str(payment.amount),
                "method": payment.method,
            },
        )
        return response

class ExpenseViewSet(BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.order_by('-date')
    
    def perform_create(self, serializer):
        expense = serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user
        )
        record_audit_event(
            action="billing.expense_created",
            user=self.request.user,
            request=self.request,
            details={
                "expense_id": str(expense.expense_id),
                "title": expense.title,
                "amount": str(expense.amount),
                "category": expense.category,
                "date": expense.date,
            },
        )

    def perform_update(self, serializer):
        before = serializer.instance
        before_snapshot = {
            "title": before.title,
            "amount": str(before.amount),
            "category": before.category,
            "date": before.date,
            "description": before.description,
        }
        expense = serializer.save()
        record_audit_event(
            action="billing.expense_updated",
            user=self.request.user,
            request=self.request,
            details={
                "expense_id": str(expense.expense_id),
                "before": before_snapshot,
                "after": {
                    "title": expense.title,
                    "amount": str(expense.amount),
                    "category": expense.category,
                    "date": expense.date,
                    "description": expense.description,
                },
            },
        )

    def perform_destroy(self, instance):
        payload = {
            "expense_id": str(instance.expense_id),
            "title": instance.title,
            "amount": str(instance.amount),
            "category": instance.category,
            "date": instance.date,
        }
        super().perform_destroy(instance)
        record_audit_event(
            action="billing.expense_deleted",
            user=self.request.user,
            request=self.request,
            details=payload,
        )

class FinanceDashboardViewSet(BillingSchemaGuardMixin, viewsets.ViewSet):
    """
    Provides aggregate financial statistics
    """
    require_tenant_schema = True
    permission_classes = [IsSchoolFinanceManager]
    
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
