from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvoiceViewSet, SubscriptionPlanHistoryViewSet, SubscriptionPlanViewSet, SubscriptionViewSet

router = DefaultRouter()
router.register(r"subscriptions", SubscriptionViewSet)
router.register(r"subscription-history", SubscriptionPlanHistoryViewSet, basename="subscription-history")
router.register(r"plans", SubscriptionPlanViewSet)
router.register(r"invoices", InvoiceViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
