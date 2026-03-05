from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from billing.models_saas import Invoice, Subscription, SubscriptionPlan, SubscriptionPlanHistory
from billing.permissions import IsSaaSAdminUser
from billing.plan_defaults import upsert_default_plans
from billing.serializers import (
    InvoiceSerializer,
    SubscriptionPlanHistorySerializer,
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
)
from billing.shared_views import BillingSchemaGuardMixin
from core.reports import generate_pdf_response
from core.utils.audit import record_audit_event
from core.utils.plan_enforcement import (
    build_plan_snapshot,
    record_subscription_plan_history,
    sync_subscription_limits_with_plan,
    sync_tenant_with_plan,
)


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
        subscriptions = Subscription.objects.filter(plan=plan).select_related("tenant")
        for subscription in subscriptions:
            sync_subscription_limits_with_plan(subscription, plan=plan, save=True)
            sync_tenant_with_plan(subscription.tenant, plan=plan, save=True)
            record_subscription_plan_history(
                subscription,
                previous_plan=previous_plan_state,
                previous_status=subscription.status,
                previous_billing_cycle=subscription.billing_cycle,
                reason="Plan definition updated",
                changed_by=getattr(self.request, "user", None),
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

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        role = (getattr(request.user, "role", "") or "").lower()
        if not (request.user.is_superuser or request.user.is_staff or role == "saas_admin"):
            return Response(
                {"error": "Only SaaS administrators can seed default plans."},
                status=status.HTTP_403_FORBIDDEN,
            )

        result = upsert_default_plans()
        serializer = self.get_serializer(result["plans"], many=True)
        return Response(
            {
                "message": "Default subscription plans are ready.",
                "created": result["created"],
                "updated": result["updated"],
                "rate_used": result["rate_used"],
                "used_fallback": result["used_fallback"],
                "plans": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="public", permission_classes=[permissions.AllowAny])
    def public(self, request):
        queryset = SubscriptionPlan.objects.filter(is_active=True).order_by("price_monthly", "name")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SubscriptionViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = Subscription.objects.select_related("tenant", "plan").all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsSaaSAdminUser]

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        subscription = self.get_object()
        history = subscription.plan_history.select_related(
            "tenant", "subscription", "previous_plan", "new_plan", "changed_by"
        ).all()
        page = self.paginate_queryset(history)
        if page is not None:
            serializer = SubscriptionPlanHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = SubscriptionPlanHistorySerializer(history, many=True)
        return Response(serializer.data)


class SubscriptionPlanHistoryViewSet(BillingSchemaGuardMixin, viewsets.ReadOnlyModelViewSet):
    require_public_schema = True
    queryset = SubscriptionPlanHistory.objects.select_related(
        "tenant", "subscription", "previous_plan", "new_plan", "changed_by"
    ).all()
    serializer_class = SubscriptionPlanHistorySerializer
    permission_classes = [IsSaaSAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        tenant_id = self.request.query_params.get("tenant_id")
        subscription_id = self.request.query_params.get("subscription_id")

        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        return queryset


class InvoiceViewSet(BillingSchemaGuardMixin, viewsets.ModelViewSet):
    require_public_schema = True
    queryset = Invoice.objects.all().order_by("-issued_date")
    serializer_class = InvoiceSerializer
    permission_classes = [IsSaaSAdminUser]

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """
        Generates and downloads a professional PDF invoice.
        """
        try:
            invoice = self.get_object()

            context = {
                "invoice": invoice,
                "platform_name": "Antigravity SaaS",
                "current_year": timezone.now().year,
            }

            filename = f"invoice_{str(invoice.invoice_id)[:12]}_{timezone.now().strftime('%Y%m%d')}.pdf"
            response = generate_pdf_response("reports/invoice.html", context, filename)

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
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


__all__ = [
    "SubscriptionViewSet",
    "SubscriptionPlanViewSet",
    "SubscriptionPlanHistoryViewSet",
    "InvoiceViewSet",
]
