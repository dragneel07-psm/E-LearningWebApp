# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.models_school import Payment, StudentFee
from billing.permissions import IsSchoolFinanceManager
from billing.shared_views import BillingSchemaGuardMixin
from core.reports import generate_excel_response, generate_pdf_response
from core.utils.audit import record_audit_event


class BillingReportViewSet(BillingSchemaGuardMixin, viewsets.ViewSet):
    """
    ViewSet for generating billing and finance reports.
    """

    require_tenant_schema = True
    permission_classes = [IsSchoolFinanceManager]

    def _tenant(self, request):
        return getattr(request.user, "tenant", None) or getattr(request, "tenant", None)

    def _log_export(self, request, *, report_type: str, fmt: str, details: dict | None = None):
        record_audit_event(
            action="billing.report_exported",
            user=getattr(request, "user", None),
            request=request,
            details={
                "report_type": report_type,
                "format": fmt,
                **(details or {}),
            },
        )

    @action(detail=False, methods=["get"], url_path="fee-collection")
    def fee_collection_pdf(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        tenant = self._tenant(request)

        payments = Payment.objects.filter(tenant=tenant).select_related("student__user", "student_fee__fee_structure").order_by("-payment_date")

        if start_date:
            payments = payments.filter(payment_date__date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__date__lte=end_date)

        total_amount = payments.aggregate(total=Sum("amount"))["total"] or 0

        for payment in payments:
            payment.fee_name = payment.student_fee.fee_structure.name if payment.student_fee else "General Payment"

        context = {
            "payments": payments,
            "total_amount": total_amount,
            "transaction_count": payments.count(),
            "currency": "USD",
            "school_name": tenant.name if tenant else "Our School",
            "date": timezone.now().strftime("%B %d, %Y"),
            "start_date": start_date or "All Time",
            "end_date": timezone.now().strftime("%Y-%m-%d"),
        }

        filename = f"fee_collection_report_{timezone.now().strftime('%Y%m%d')}.pdf"
        response = generate_pdf_response("reports/fee_collection.html", context, filename)

        if response:
            self._log_export(
                request,
                report_type="fee_collection",
                fmt="pdf",
                details={"rows": payments.count(), "start_date": start_date, "end_date": end_date},
            )
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="fee-collection-excel")
    def fee_collection_excel(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        tenant = self._tenant(request)

        payments = Payment.objects.filter(tenant=tenant).select_related("student__user", "student_fee__fee_structure").order_by("-payment_date")

        if start_date:
            payments = payments.filter(payment_date__date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__date__lte=end_date)

        data = []
        for payment in payments:
            data.append(
                {
                    "Date": payment.payment_date.strftime("%Y-%m-%d"),
                    "Student": payment.student.user.get_full_name(),
                    "Fee Type": payment.student_fee.fee_structure.name if payment.student_fee else "General Payment",
                    "Method": payment.get_method_display(),
                    "Transaction ID": payment.transaction_id or "N/A",
                    "Amount": float(payment.amount),
                }
            )

        columns = ["Date", "Student", "Fee Type", "Method", "Transaction ID", "Amount"]
        filename = f"fee_collection_report_{timezone.now().strftime('%Y%m%d')}.xlsx"
        self._log_export(
            request,
            report_type="fee_collection",
            fmt="xlsx",
            details={"rows": len(data), "start_date": start_date, "end_date": end_date},
        )
        return generate_excel_response(data, columns, filename)

    @action(detail=False, methods=["get"], url_path="pending-fees")
    def pending_fees_pdf(self, request):
        tenant = self._tenant(request)
        pending_fees = StudentFee.objects.filter(
            tenant=tenant,
            status__in=["pending", "partial", "overdue"],
        ).select_related("student__user", "fee_structure").order_by("due_date")

        total_due = pending_fees.aggregate(
            total=Sum(models.F("amount_due") - models.F("amount_paid"))
        )["total"] or 0

        context = {
            "pending_fees": pending_fees,
            "total_due": total_due,
            "count": pending_fees.count(),
            "school_name": tenant.name if tenant else "Our School",
            "date": timezone.now().strftime("%B %d, %Y"),
        }

        filename = f"pending_fees_report_{timezone.now().strftime('%Y%m%d')}.pdf"
        response = generate_pdf_response("reports/pending_fees.html", context, filename)

        if response:
            self._log_export(
                request,
                report_type="pending_fees",
                fmt="pdf",
                details={"rows": pending_fees.count()},
            )
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="pending-fees-excel")
    def pending_fees_excel(self, request):
        tenant = self._tenant(request)
        pending_fees = StudentFee.objects.filter(
            tenant=tenant,
            status__in=["pending", "partial", "overdue"],
        ).select_related("student__user", "fee_structure").order_by("due_date")

        data = []
        for fee in pending_fees:
            data.append(
                {
                    "Student": fee.student.user.get_full_name(),
                    "Fee Type": fee.fee_structure.name,
                    "Due Date": fee.due_date.strftime("%Y-%m-%d"),
                    "Status": fee.get_status_display(),
                    "Amount Due": float(fee.amount_due),
                    "Amount Paid": float(fee.amount_paid),
                    "Balance": float(fee.amount_due - fee.amount_paid),
                }
            )

        columns = ["Student", "Fee Type", "Due Date", "Status", "Amount Due", "Amount Paid", "Balance"]
        filename = f"pending_fees_report_{timezone.now().strftime('%Y%m%d')}.xlsx"
        self._log_export(
            request,
            report_type="pending_fees",
            fmt="xlsx",
            details={"rows": len(data)},
        )
        return generate_excel_response(data, columns, filename)


__all__ = ["BillingReportViewSet"]
