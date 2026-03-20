# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import logging
from datetime import date, timedelta
from celery import shared_task
from django.db.models import Sum
from django_tenants.utils import schema_context, get_tenant_model

logger = logging.getLogger(__name__)


@shared_task(name="billing_school.send_fee_due_reminders", bind=True, max_retries=3)
def send_fee_due_reminders(self):
    """
    Runs daily at 8 AM. For each tenant, find fees due in 0, 3, or 7 days
    and notify parents via in-app + SMS.
    """
    TenantModel = get_tenant_model()
    for tenant in TenantModel.objects.exclude(schema_name='public'):
        try:
            with schema_context(tenant.schema_name):
                _process_tenant_fee_reminders(tenant)
        except Exception as exc:
            logger.error("Fee reminder failed for tenant %s: %s", tenant.schema_name, exc)


def _process_tenant_fee_reminders(tenant):
    from billing.models_school import StudentFee
    from notifications.services import NotificationService

    today = date.today()
    target_dates = [today, today + timedelta(days=3), today + timedelta(days=7)]

    fees = (
        StudentFee.objects.filter(
            tenant=tenant,
            due_date__in=target_dates,
            status__in=['pending', 'partial', 'overdue'],
        )
        .select_related('student__user', 'fee_structure')
        .prefetch_related('student__parents__user')
    )

    sent = 0
    for fee in fees:
        balance = fee.amount_due - (fee.amount_paid or 0)
        if balance <= 0:
            continue
        days_left = (fee.due_date - today).days
        if days_left == 0:
            timing = "today"
        elif days_left < 0:
            timing = f"{abs(days_left)} day(s) ago (OVERDUE)"
        else:
            timing = f"in {days_left} day(s)"

        fee_name = getattr(fee.fee_structure, 'name', 'School Fee')
        message = (
            f"Dear Parent, NPR {balance:,.0f} for {fee_name} is due {timing}. "
            f"Please pay at the school or use the online portal to avoid late fees."
        )
        title = f"Fee Due {timing.title()}: {fee_name}"

        for parent in fee.student.parents.all():
            try:
                NotificationService.create_notification(
                    recipient=parent.user,
                    title=title,
                    message=message,
                    tenant=tenant,
                    link="/fees",
                    channels=['in_app', 'sms'],
                )
                sent += 1
            except Exception as exc:
                logger.warning("Could not notify parent %s: %s", parent.user_id, exc)

    logger.info("Fee reminders: sent %d notifications for tenant %s", sent, tenant.schema_name)
