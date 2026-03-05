from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, FeeStructureViewSet, FinanceDashboardViewSet, PaymentViewSet, StudentFeeViewSet
from .views_reports import BillingReportViewSet

router = DefaultRouter()
router.register(r"fee-structures", FeeStructureViewSet)
router.register(r"student-fees", StudentFeeViewSet)
router.register(r"payments", PaymentViewSet)
router.register(r"expenses", ExpenseViewSet)
router.register(r"dashboard", FinanceDashboardViewSet, basename="finance-dashboard")
router.register(r"reports", BillingReportViewSet, basename="billing-reports")

urlpatterns = [
    path("", include(router.urls)),
]
