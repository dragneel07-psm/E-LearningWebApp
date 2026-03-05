"""
core/middleware/__init__.py
───────────────────────────
Custom middleware for request context and tenant resolution.

Priority order:
  1. Domain-based lookup (standard django-tenants)
  2. x-tenant-id header (dev/local only by default)
  3. Falls through to no_tenant_found() as usual
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

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response


class TenantFromHeaderMiddleware(TenantMainMiddleware):
    """
    Extends django-tenants middleware with a strict tenant-header trust mode.

    Trust modes:
      - dev_only (default): trust x-tenant-id only when DEBUG=True
      - always: trust x-tenant-id in all environments (not recommended)
      - never: ignore x-tenant-id in all environments
    """

    @staticmethod
    def _should_trust_tenant_header() -> bool:
        mode = str(getattr(settings, "TENANT_HEADER_TRUST_MODE", "dev_only")).strip().lower()
        if mode == "always":
            return True
        if mode == "never":
            return False
        # dev_only (default)
        return bool(getattr(settings, "DEBUG", False))

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

        if tenant is None and tenant_id and self._should_trust_tenant_header():
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

        # 3. Fall back to public tenant for SaaS/public routes
        if tenant is None:
            tenant = tenant_model.objects.filter(schema_name__iexact="public").first()

        # 4. Nothing resolved
        if tenant is None:
            return self.no_tenant_found(request, hostname)

        # 5. Tenant status gate
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
