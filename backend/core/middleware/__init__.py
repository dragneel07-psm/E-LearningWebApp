"""
core/middleware/__init__.py
───────────────────────────
Custom middleware for request context and tenant resolution.

Priority order:
  1. Domain-based lookup (mandatory in production)
  2. x-tenant-id header (debug + local development only)
"""

import re
import uuid
from django.conf import settings
from django.http import JsonResponse
from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_domain_model, get_tenant_model
from django.db import connection
from django.db import DatabaseError
from django.db.models import Q
from core.logging_context import reset_request_context, set_request_context


REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-_.]{8,128}$")
ACTIVE_TENANT_STATUSES = {"active", "trial"}


class RequestContextMiddleware:
    """
    Adds a stable request_id to request/response for tracing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        incoming_id = (request.headers.get("X-Request-ID", "") or "").strip()
        request_id = incoming_id if REQUEST_ID_PATTERN.match(incoming_id) else str(uuid.uuid4())
        request.request_id = request_id
        set_request_context(request_id=request_id)
        try:
            response = self.get_response(request)
        finally:
            reset_request_context()
        response["X-Request-ID"] = request_id
        return response


def _build_csp_header(policy: dict) -> str:
    if not isinstance(policy, dict):
        return ""

    directives = []
    for directive, values in policy.items():
        if not directive:
            continue
        clean_directive = str(directive).strip().lower()
        if not clean_directive:
            continue

        if isinstance(values, str):
            clean_values = values.strip()
        else:
            clean_values = " ".join(
                str(item).strip() for item in (values or []) if str(item).strip()
            ).strip()

        if clean_values:
            directives.append(f"{clean_directive} {clean_values}")
        else:
            directives.append(clean_directive)
    return "; ".join(directives)


class SecurityHeadersMiddleware:
    """
    Applies a configurable CSP and permissions policy baseline.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        csp_header_value = _build_csp_header(getattr(settings, "SECURITY_CSP_POLICY", {}))
        if csp_header_value:
            csp_header_name = (
                "Content-Security-Policy-Report-Only"
                if bool(getattr(settings, "SECURITY_CSP_REPORT_ONLY", False))
                else "Content-Security-Policy"
            )
            if csp_header_name not in response:
                response[csp_header_name] = csp_header_value

        permissions_policy = str(getattr(settings, "SECURITY_PERMISSIONS_POLICY", "") or "").strip()
        if permissions_policy and "Permissions-Policy" not in response:
            response["Permissions-Policy"] = permissions_policy

        return response


class TenantFromHeaderMiddleware(TenantMainMiddleware):
    """
    Extends django-tenants middleware with a strict tenant-header trust mode.

    Trust modes:
      - dev_only (default): trust x-tenant-id only in DEBUG + local hostnames
      - never: ignore x-tenant-id in all environments
    """

    @staticmethod
    def _is_local_hostname(hostname: str) -> bool:
        host = str(hostname or "").strip().lower()
        if not host:
            return False
        host = host.split(":", 1)[0]
        if host in {"localhost", "127.0.0.1", "::1", "[::1]"}:
            return True
        return host.endswith(".localhost") or host.endswith(".localtest.me") or host.endswith(".lvh.me")

    @classmethod
    def _should_trust_tenant_header(cls, hostname: str) -> bool:
        mode = str(getattr(settings, "TENANT_HEADER_TRUST_MODE", "dev_only")).strip().lower()
        if mode == "never":
            return False
        if not bool(getattr(settings, "DEBUG", False)):
            return False
        if not cls._is_local_hostname(hostname):
            return False
        # dev_only (default) while DEBUG/local only.
        return True

    @staticmethod
    def _tenant_identifier_matches(domain_model, tenant, tenant_identifier: str) -> bool:
        candidate = str(tenant_identifier or "").strip().lower()
        if not candidate:
            return True

        if candidate == str(getattr(tenant, "schema_name", "") or "").strip().lower():
            return True
        subdomain = str(getattr(tenant, "subdomain", "") or "").strip().lower()
        if subdomain and candidate == subdomain:
            return True

        try:
            return domain_model.objects.filter(tenant=tenant).filter(
                Q(domain__iexact=candidate) | Q(domain__istartswith=f"{candidate}.")
            ).exists()
        except Exception:
            return False

    @staticmethod
    def _is_tenant_active(tenant) -> bool:
        tenant_status = str(getattr(tenant, "status", "active") or "active").strip().lower()
        return tenant_status in ACTIVE_TENANT_STATUSES

    def process_request(self, request):
        connection.set_schema_to_public()

        hostname = self.hostname_from_request(request)
        domain_model = get_tenant_domain_model()
        tenant_model = get_tenant_model()

        tenant = None

        # 1. Resolve by domain first (production-safe default)
        try:
            tenant = self.get_tenant(domain_model, hostname)
        except domain_model.DoesNotExist:
            tenant = None

        # 2. Optional x-tenant-id fallback (dev/local by default)
        tenant_id = (
            request.META.get('HTTP_X_TENANT_ID', '')
            or request.headers.get('x-tenant-id', '')
        ).strip().lower()

        trust_header = self._should_trust_tenant_header(hostname)
        if tenant is None and tenant_id and trust_header:
            # Accept school code as schema_name OR subdomain OR domain.
            try:
                # Keep this migration-safe: resolve by schema/domain first.
                # (subdomain can be absent in stale DB schema and cause 500)
                tenant_pk = (
                    domain_model.objects.select_related("tenant")
                    .filter(
                        Q(tenant__schema_name__iexact=tenant_id)
                        | Q(domain__iexact=tenant_id)
                        | Q(domain__istartswith=f"{tenant_id}.")
                    )
                    .values_list("tenant", flat=True)
                    .first()
                )
                if tenant_pk:
                    tenant = tenant_model.objects.filter(pk=tenant_pk).first()
                else:
                    tenant = tenant_model.objects.filter(
                        schema_name__iexact=tenant_id
                    ).first()
            except DatabaseError:
                tenant = tenant_model.objects.filter(
                    schema_name__iexact=tenant_id
                ).first()

        # 3. In production, domain is mandatory and header fallback is disabled.
        if tenant is None and not bool(getattr(settings, "DEBUG", False)):
            return JsonResponse(
                {
                    "code": "tenant_domain_required",
                    "message": "Unable to resolve tenant from domain.",
                    "trace_id": getattr(request, "request_id", None),
                },
                status=400,
            )

        # 4. In debug, keep public fallback for local developer workflows.
        if tenant is None:
            tenant = tenant_model.objects.filter(schema_name__iexact="public").first()

        # 5. Nothing resolved
        if tenant is None:
            return self.no_tenant_found(request, hostname)

        # 6. Reject spoofed x-tenant-id on non-trusted environments.
        if tenant_id and not trust_header and not self._tenant_identifier_matches(domain_model, tenant, tenant_id):
            return JsonResponse(
                {
                    "code": "tenant_header_rejected",
                    "message": "x-tenant-id header is not accepted for this environment.",
                    "trace_id": getattr(request, "request_id", None),
                },
                status=400,
            )

        # 7. Tenant status gate
        set_request_context(
            tenant_schema=getattr(tenant, "schema_name", "public"),
            tenant_id=str(getattr(tenant, "id", "") or "-"),
        )
        if tenant.schema_name != "public" and not self._is_tenant_active(tenant):
            return JsonResponse(
                {
                    "code": "tenant_inactive",
                    "message": "Tenant is not active. Contact your administrator.",
                    "tenant_status": getattr(tenant, "status", None),
                    "trace_id": getattr(request, "request_id", None),
                },
                status=403,
            )

        tenant.domain_url = hostname
        request.tenant = tenant
        connection.set_tenant(request.tenant)
        self.setup_url_routing(request)
