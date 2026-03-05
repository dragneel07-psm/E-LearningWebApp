"""
Backward-compatible import surface for billing reports viewsets.

New code should import from:
- billing_school.views_reports
"""

from billing_school.views_reports import BillingReportViewSet

__all__ = ["BillingReportViewSet"]
