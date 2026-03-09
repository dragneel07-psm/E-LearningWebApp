import io
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from billing.models_school import Expense, FeeStructure, Payment, StudentFee
from billing.permissions import IsSchoolFinanceManager
from billing.serializers import ExpenseSerializer, FeeStructureSerializer, PaymentSerializer, StudentFeeSerializer
from billing.shared_views import BillingIdempotencyMixin, BillingSchemaGuardMixin
from core.mixins import TenantScopedQuerysetMixin
from core.utils.audit import record_audit_event


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


class StudentFeeViewSet(BillingIdempotencyMixin, BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related("student__user", "fee_structure")

    def create(self, request, *args, **kwargs):
        def _execute():
            return super(StudentFeeViewSet, self).create(request, *args, **kwargs)

        return self._idempotent_execute(
            request,
            endpoint="billing.student_fees.create",
            resource_type="student_fee",
            resource_id_field="student_fee_id",
            execute=_execute,
        )

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

    @action(detail=False, methods=["post"])
    def assign_bulk(self, request):
        """
        Assign a fee structure to all students in a class.
        Expects: fee_structure_id, academic_class_id, due_date
        """

        def _execute():
            fee_structure_id = request.data.get("fee_structure_id")
            academic_class_id = request.data.get("academic_class_id")
            due_date = request.data.get("due_date")

            if not all([fee_structure_id, academic_class_id, due_date]):
                return Response(
                    {"error": "Missing required fields: fee_structure_id, academic_class_id, and due_date are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                from academic.models import Student

                tenant = getattr(request.user, "tenant", None)
                if not tenant:
                    return Response({"error": "User has no associated tenant"}, status=status.HTTP_400_BAD_REQUEST)

                fee_structure = FeeStructure.objects.get(fee_id=fee_structure_id, tenant=tenant)
                students = Student.objects.filter(academic_class_id=academic_class_id, user__tenant=tenant)

                if not students.exists():
                    return Response({"error": "No students found in the selected class"}, status=status.HTTP_404_NOT_FOUND)

                with transaction.atomic():
                    created_count = 0
                    for student in students:
                        StudentFee.objects.create(
                            tenant=tenant,
                            student=student,
                            fee_structure=fee_structure,
                            amount_due=fee_structure.amount,
                            due_date=due_date,
                            status="pending",
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

                return Response({"message": f"Successfully assigned fee to {created_count} students"}, status=status.HTTP_201_CREATED)
            except FeeStructure.DoesNotExist:
                return Response({"error": "Fee structure not found"}, status=status.HTTP_404_NOT_FOUND)
            except Exception as exc:
                return Response({"error": f"Assignment failed: {str(exc)}"}, status=status.HTTP_400_BAD_REQUEST)

        return self._idempotent_execute(
            request,
            endpoint="billing.student_fees.assign_bulk",
            resource_type="student_fee_bulk",
            resource_id_field="message",
            execute=_execute,
        )


class PaymentViewSet(BillingIdempotencyMixin, BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related("student__user", "recorded_by", "student_fee__fee_structure")

    def create(self, request, *args, **kwargs):
        def _execute():
            return super(PaymentViewSet, self).create(request, *args, **kwargs)

        return self._idempotent_execute(
            request,
            endpoint="billing.payments.create",
            resource_type="payment",
            resource_id_field="payment_id",
            execute=_execute,
        )

    def perform_create(self, serializer):
        if not getattr(self.request.user, "tenant", None):
            raise PermissionDenied("Authenticated user is not associated with a tenant.")

        payment = serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user,
        )
        fee_before = None
        if payment.student_fee:
            fee_before = {
                "student_fee_id": str(payment.student_fee.student_fee_id),
                "amount_paid": str(payment.student_fee.amount_paid),
                "status": payment.student_fee.status,
            }

        if payment.student_fee:
            student_fee = payment.student_fee
            student_fee.amount_paid += payment.amount

            if student_fee.amount_paid >= student_fee.amount_due:
                student_fee.status = "paid"
            elif student_fee.amount_paid > 0:
                student_fee.status = "partial"

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

    @action(detail=True, methods=["get"])
    def generate_receipt(self, request, pk=None):
        payment = self.get_object()

        buffer = io.BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(100, height - 80, "PAYMENT RECEIPT")
        pdf.setFont("Helvetica", 12)
        pdf.drawString(100, height - 100, f"School: {payment.tenant.name}")
        pdf.drawString(100, height - 120, f"Date: {payment.payment_date.strftime('%Y-%m-%d %H:%M')}")
        pdf.drawString(100, height - 140, f"Receipt No: REC-{str(payment.payment_id)[:8]}")

        pdf.line(100, height - 150, width - 100, height - 150)

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(100, height - 180, "Student Details")
        pdf.setFont("Helvetica", 12)
        pdf.drawString(100, height - 200, f"Name: {payment.student.user.get_full_name()}")
        pdf.drawString(100, height - 220, f"Student ID: {payment.student.student_id}")

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(100, height - 260, "Payment Details")
        pdf.setFont("Helvetica", 12)
        pdf.drawString(
            100,
            height - 280,
            f"Fee Title: {payment.student_fee.fee_structure.name if payment.student_fee else 'General Fee'}",
        )
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(100, height - 310, f"Amount Paid: ${payment.amount}")
        pdf.setFont("Helvetica", 12)
        pdf.drawString(100, height - 330, f"Method: {payment.method.capitalize()}")
        pdf.drawString(100, height - 350, f"Transaction ID: {payment.transaction_id or 'N/A'}")

        pdf.line(100, height - 380, width - 100, height - 380)

        pdf.setFont("Helvetica-Oblique", 10)
        pdf.drawString(100, height - 400, "This is a computer generated receipt.")
        pdf.drawString(100, height - 415, f"Recorded by: {payment.recorded_by.get_full_name() if payment.recorded_by else 'Admin'}")

        pdf.showPage()
        pdf.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipt_{payment.payment_id}.pdf"'
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


class ExpenseViewSet(BillingIdempotencyMixin, BillingSchemaGuardMixin, TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    require_tenant_schema = True
    allow_unscoped_for_saas = False
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsSchoolFinanceManager]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.select_related("recorded_by").order_by("-date")

    def create(self, request, *args, **kwargs):
        def _execute():
            return super(ExpenseViewSet, self).create(request, *args, **kwargs)

        return self._idempotent_execute(
            request,
            endpoint="billing.expenses.create",
            resource_type="expense",
            resource_id_field="expense_id",
            execute=_execute,
        )

    def perform_create(self, serializer):
        expense = serializer.save(
            tenant=self.request.user.tenant,
            recorded_by=self.request.user,
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

    @method_decorator(cache_page(60 * 5))
    def list(self, request):
        user = request.user
        tenant = getattr(user, "tenant", None)
        if not tenant:
            tenant = getattr(request, "tenant", None)

        if not tenant:
            return Response(
                {
                    "total_revenue": 0.0,
                    "total_pending": 0.0,
                    "total_expenses": 0.0,
                    "net_balance": 0.0,
                    "recent_payments": [],
                    "recent_expenses": [],
                    "notice": "No school tenant identified for this session. Showing summary only.",
                }
            )

        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        payments_qs = Payment.objects.filter(tenant=tenant)
        expenses_qs = Expense.objects.filter(tenant=tenant)

        if start_date:
            payments_qs = payments_qs.filter(payment_date__date__gte=start_date)
            expenses_qs = expenses_qs.filter(date__gte=start_date)
        if end_date:
            payments_qs = payments_qs.filter(payment_date__date__lte=end_date)
            expenses_qs = expenses_qs.filter(date__lte=end_date)

        revenue_agg = payments_qs.aggregate(total=Sum("amount"))
        total_revenue = revenue_agg["total"] or 0

        pending_fees_qs = StudentFee.objects.filter(
            tenant=tenant,
            status__in=["pending", "partial", "overdue"],
        )
        if start_date:
            pending_fees_qs = pending_fees_qs.filter(due_date__gte=start_date)
        if end_date:
            pending_fees_qs = pending_fees_qs.filter(due_date__lte=end_date)

        total_due = pending_fees_qs.aggregate(total=Sum("amount_due"))["total"] or 0
        total_paid_against_pending = pending_fees_qs.aggregate(total=Sum("amount_paid"))["total"] or 0
        total_pending = max(0, total_due - total_paid_against_pending)

        expense_agg = expenses_qs.aggregate(total=Sum("amount"))
        total_expenses = expense_agg["total"] or 0

        recent_payments = Payment.objects.filter(tenant=tenant).select_related(
            "student__user", "student_fee__fee_structure"
        ).order_by("-payment_date")[:5]
        recent_expenses = Expense.objects.filter(tenant=tenant).select_related("recorded_by").order_by("-date")[:5]

        return Response(
            {
                "total_revenue": float(total_revenue),
                "total_pending": float(total_pending),
                "total_expenses": float(total_expenses),
                "net_balance": float(total_revenue - total_expenses),
                "recent_payments": PaymentSerializer(recent_payments, many=True).data,
                "recent_expenses": ExpenseSerializer(recent_expenses, many=True).data,
            }
        )


    @action(detail=False, methods=["get"], url_path="analytics")
    def analytics(self, request):
        """
        Richer analytics for the finance dashboard:
        - monthly_collections: last 12 months of payment totals
        - expense_by_category: expenses grouped by category
        - fee_status_breakdown: count + amounts per status
        - collection_rate: % of total fees collected
        - top_defaulters: students with highest outstanding balances
        """
        user = request.user
        tenant = getattr(user, "tenant", None) or getattr(request, "tenant", None)
        if not tenant:
            return Response({
                "monthly_collections": [],
                "expense_by_category": [],
                "fee_status_breakdown": [],
                "collection_rate": 0,
                "top_defaulters": [],
            })

        # ── Monthly collections (last 12 months) ────────────────────────────
        twelve_months_ago = date.today().replace(day=1) - timedelta(days=335)
        monthly_qs = (
            Payment.objects
            .filter(tenant=tenant, payment_date__date__gte=twelve_months_ago)
            .annotate(month=TruncMonth("payment_date"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("month")
        )
        monthly_collections = [
            {
                "month": item["month"].strftime("%Y-%m"),
                "label": item["month"].strftime("%b %Y"),
                "total": float(item["total"] or 0),
            }
            for item in monthly_qs
        ]

        # ── Expense by category ──────────────────────────────────────────────
        expense_cats = (
            Expense.objects
            .filter(tenant=tenant)
            .values("category")
            .annotate(total=Sum("amount"), count=Count("expense_id"))
            .order_by("-total")
        )
        expense_by_category = [
            {"category": item["category"], "total": float(item["total"] or 0), "count": item["count"]}
            for item in expense_cats
        ]

        # ── Fee status breakdown ─────────────────────────────────────────────
        status_qs = (
            StudentFee.objects
            .filter(tenant=tenant)
            .values("status")
            .annotate(
                count=Count("student_fee_id"),
                total_due=Sum("amount_due"),
                total_paid=Sum("amount_paid"),
            )
        )
        fee_status_breakdown = [
            {
                "status": item["status"],
                "count": item["count"],
                "total_due": float(item["total_due"] or 0),
                "total_paid": float(item["total_paid"] or 0),
            }
            for item in status_qs
        ]

        # ── Collection rate ──────────────────────────────────────────────────
        all_fees = StudentFee.objects.filter(tenant=tenant).aggregate(
            total_due=Sum("amount_due"),
            total_paid=Sum("amount_paid"),
        )
        total_due_all = float(all_fees["total_due"] or 0)
        total_paid_all = float(all_fees["total_paid"] or 0)
        collection_rate = round((total_paid_all / total_due_all * 100), 1) if total_due_all > 0 else 0.0

        # ── Top defaulters ───────────────────────────────────────────────────
        from academic.models import Student
        defaulter_fees = (
            StudentFee.objects
            .filter(tenant=tenant, status__in=["pending", "partial", "overdue"])
            .values("student_id")
            .annotate(
                outstanding=Sum("amount_due") - Sum("amount_paid"),
                fee_count=Count("student_fee_id"),
            )
            .filter(outstanding__gt=0)
            .order_by("-outstanding")[:10]
        )
        student_ids = [d["student_id"] for d in defaulter_fees]
        students_map = {
            str(s.student_id): s.user.get_full_name()
            for s in Student.objects.filter(student_id__in=student_ids).select_related("user")
        }
        top_defaulters = [
            {
                "student_id": str(d["student_id"]),
                "student_name": students_map.get(str(d["student_id"]), "Unknown"),
                "outstanding": float(d["outstanding"] or 0),
                "fee_count": d["fee_count"],
            }
            for d in defaulter_fees
        ]

        return Response({
            "monthly_collections": monthly_collections,
            "expense_by_category": expense_by_category,
            "fee_status_breakdown": fee_status_breakdown,
            "collection_rate": collection_rate,
            "top_defaulters": top_defaulters,
        })


__all__ = [
    "FeeStructureViewSet",
    "StudentFeeViewSet",
    "PaymentViewSet",
    "ExpenseViewSet",
    "FinanceDashboardViewSet",
]
