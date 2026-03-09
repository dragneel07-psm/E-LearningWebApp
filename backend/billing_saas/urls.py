from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    InvoiceViewSet, SubscriptionPlanHistoryViewSet, SubscriptionPlanViewSet, SubscriptionViewSet,
    SaasGrowthAnalyticsView, SaasHealthMonitorView,
)

router = DefaultRouter()
router.register(r"subscriptions", SubscriptionViewSet)
router.register(r"subscription-history", SubscriptionPlanHistoryViewSet, basename="subscription-history")
router.register(r"plans", SubscriptionPlanViewSet)
router.register(r"invoices", InvoiceViewSet)

urlpatterns = [
    path("analytics/growth/", SaasGrowthAnalyticsView.as_view(), name="saas-analytics-growth"),
    path("analytics/health/", SaasHealthMonitorView.as_view(), name="saas-analytics-health"),
    path("", include(router.urls)),
]
