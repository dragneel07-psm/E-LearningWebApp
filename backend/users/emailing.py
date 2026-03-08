from __future__ import annotations

import logging
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from core.models.tenant import Domain

logger = logging.getLogger(__name__)


def _base_scheme() -> str:
    parsed = urlsplit(getattr(settings, "FRONTEND_URL", "") or "")
    if parsed.scheme:
        return parsed.scheme
    return "https"


def _normalize_base_url(raw_url: str) -> str:
    value = (raw_url or "").strip().rstrip("/")
    if not value:
        return ""
    if "://" in value:
        return value
    return f"{_base_scheme()}://{value}"


def resolve_frontend_url_for_tenant(tenant=None) -> str:
    default_frontend = _normalize_base_url(getattr(settings, "FRONTEND_URL", "")) or "http://localhost:3000"
    if not tenant:
        return default_frontend

    try:
        primary_domain = Domain.objects.filter(tenant=tenant, is_primary=True).first()
    except Exception:
        primary_domain = None

    if primary_domain and getattr(primary_domain, "domain", ""):
        return _normalize_base_url(primary_domain.domain) or default_frontend

    subdomain = (getattr(tenant, "subdomain", "") or "").strip().lower()
    base_domain = (getattr(settings, "BASE_DOMAIN", "") or "").strip().lower()
    if subdomain and base_domain:
        return f"{_base_scheme()}://{subdomain}.{base_domain}"

    return default_frontend


def build_password_reset_link(user, *, tenant=None) -> str:
    tenant_for_link = tenant or getattr(user, "tenant", None)
    frontend_base = resolve_frontend_url_for_tenant(tenant_for_link)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{frontend_base}/reset-password?uidb64={uidb64}&token={token}"


def build_email_verification_link(user) -> str:
    frontend_base = resolve_frontend_url_for_tenant(None)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{frontend_base}/verify-email?uidb64={uidb64}&token={token}"


def send_password_reset_email(user, *, tenant=None, reason: str = "password_reset") -> None:
    reset_link = build_password_reset_link(user, tenant=tenant)
    tenant_name = getattr(tenant or getattr(user, "tenant", None), "name", "") or "your account"
    subject = "Password Reset Request"
    message = (
        f"Hello {getattr(user, 'first_name', '') or 'there'},\n\n"
        f"We received a request to reset your password for {tenant_name}.\n"
        f"Use this secure link to continue:\n{reset_link}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("Password reset email sent", extra={"email": user.email, "reason": reason})


def send_saas_admin_registration_email(user) -> None:
    verify_link = build_email_verification_link(user)
    login_url = f"{resolve_frontend_url_for_tenant(None)}/login/saas"
    subject = "Verify Your SaaS Admin Email Address"
    message = (
        f"Hello {getattr(user, 'first_name', '') or 'there'},\n\n"
        "Thanks for registering your SaaS admin account.\n"
        "Please verify your email address before signing in:\n"
        f"{verify_link}\n\n"
        f"After verification, sign in at: {login_url}\n\n"
        "Regards,\nE-Learning Platform"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("SaaS admin registration email sent", extra={"email": user.email})


def send_tenant_account_created_email(user, *, tenant) -> None:
    tenant_base = resolve_frontend_url_for_tenant(tenant)
    login_url = f"{tenant_base}/login"
    reset_link = build_password_reset_link(user, tenant=tenant)
    subject = f"Your {tenant.name} Account Is Ready"
    message = (
        f"Hello {getattr(user, 'first_name', '') or 'there'},\n\n"
        f"An account has been created for you in {tenant.name}.\n"
        f"Role: {getattr(user, 'role', 'user')}\n\n"
        f"Login URL: {login_url}\n"
        f"Forgot password / set a new password: {reset_link}\n\n"
        "If this was unexpected, contact your school administrator."
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("Tenant account created email sent", extra={"email": user.email, "tenant": tenant.schema_name})
