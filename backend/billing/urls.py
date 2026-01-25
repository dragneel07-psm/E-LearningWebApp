from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubscriptionViewSet, SubscriptionPlanViewSet, InvoiceViewSet,
    FeeStructureViewSet, StudentFeeViewSet, PaymentViewSet, ExpenseViewSet, FinanceDashboardViewSet
)
from .views_reports import BillingReportViewSet

router = DefaultRouter()
router.register(r'subscriptions', SubscriptionViewSet)
router.register(r'plans', SubscriptionPlanViewSet)
router.register(r'invoices', InvoiceViewSet)

# School Finance
router.register(r'fee-structures', FeeStructureViewSet)
router.register(r'student-fees', StudentFeeViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'dashboard', FinanceDashboardViewSet, basename='finance-dashboard')
router.register(r'reports', BillingReportViewSet, basename='billing-reports')

urlpatterns = [
    path('', include(router.urls)),
]
