# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, FeeStructureViewSet, FinanceDashboardViewSet, PaymentViewSet, StudentFeeViewSet
from .views_reports import BillingReportViewSet
from .views_discount import FeeDiscountViewSet
from .views_ledger import LedgerAccountViewSet, LedgerEntryViewSet
from .views_payment_gateway import (
    EsewaInitiateView, EsewaCallbackView,
    KhaltiInitiateView, KhaltiCallbackView,
)

router = DefaultRouter()
router.register(r"fee-structures", FeeStructureViewSet)
router.register(r"student-fees", StudentFeeViewSet)
router.register(r"payments", PaymentViewSet)
router.register(r"expenses", ExpenseViewSet)
router.register(r"dashboard", FinanceDashboardViewSet, basename="finance-dashboard")
router.register(r"reports", BillingReportViewSet, basename="billing-reports")
router.register(r"discounts", FeeDiscountViewSet, basename="fee-discount")
router.register(r"ledger-accounts", LedgerAccountViewSet, basename="ledger-account")
router.register(r"ledger-entries", LedgerEntryViewSet, basename="ledger-entry")

urlpatterns = [
    path("", include(router.urls)),
    path("esewa/initiate/", EsewaInitiateView.as_view(), name="esewa-initiate"),
    path("esewa/callback/", EsewaCallbackView.as_view(), name="esewa-callback"),
    path("khalti/initiate/", KhaltiInitiateView.as_view(), name="khalti-initiate"),
    path("khalti/callback/", KhaltiCallbackView.as_view(), name="khalti-callback"),
]
