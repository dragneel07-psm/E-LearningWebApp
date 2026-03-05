from __future__ import annotations

from core.async_jobs import background_task
from notifications.services import EmailService, SMSService


@background_task(name="notifications.send_email")
def send_email_notification_task(
    recipient_email: str,
    subject: str,
    message: str,
    html_message: str | None = None,
):
    return EmailService.send_email(
        recipient_email=recipient_email,
        subject=subject,
        message=message,
        html_message=html_message,
    )


@background_task(name="notifications.send_sms")
def send_sms_notification_task(recipient_phone: str, message: str):
    return SMSService.send_sms(recipient_phone=recipient_phone, message=message)

