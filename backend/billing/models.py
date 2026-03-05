"""
Billing compatibility export module.

Current split:
- billing.models_saas: public-schema SaaS billing models
- billing.models_school: tenant-schema school finance models

Keep exports stable here so existing imports (`from billing.models import ...`)
continue to work during phased app split.
"""

from .models_base import SchemaScopedBillingModel
from .models_saas import Invoice, Subscription, SubscriptionPlan, SubscriptionPlanHistory
from .models_school import BillingIdempotencyKey, Expense, FeeStructure, Payment, StudentFee

__all__ = [
    "SchemaScopedBillingModel",
    "SubscriptionPlan",
    "Subscription",
    "SubscriptionPlanHistory",
    "Invoice",
    "FeeStructure",
    "StudentFee",
    "Payment",
    "Expense",
    "BillingIdempotencyKey",
]
