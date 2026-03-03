"""
core/middleware/__init__.py
───────────────────────────
Custom tenant middleware with x-tenant-id header override.

Priority order:
  1. x-tenant-id header (highest priority — explicit tenant specified by client)
  2. Domain-based lookup (standard django-tenants — e.g. demo.localhost)
  3. Falls through to no_tenant_found() as usual
"""

from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_domain_model, get_tenant_model
from django.db import connection
from django.db import DatabaseError
from django.db.models import Q


class TenantFromHeaderMiddleware(TenantMainMiddleware):
    """
    Extends django-tenants middleware so API clients (React on localhost:3000,
    Postman, mobile app) can override tenant routing by sending:
        x-tenant-id: demo
    """

    def process_request(self, request):
        connection.set_schema_to_public()

        hostname = self.hostname_from_request(request)
        domain_model = get_tenant_domain_model()
        tenant_model = get_tenant_model()

        tenant = None

        # 1. Check x-tenant-id header first (takes priority over subdomain)
        tenant_id = (
            request.META.get('HTTP_X_TENANT_ID', '')
            or request.headers.get('x-tenant-id', '')
        ).strip().lower()

        if tenant_id:
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

        # 2. Fall back to standard domain-based resolution
        if tenant is None:
            try:
                tenant = self.get_tenant(domain_model, hostname)
            except domain_model.DoesNotExist:
                tenant = None

        # 3. Nothing resolved
        if tenant is None:
            return self.no_tenant_found(request, hostname)

        tenant.domain_url = hostname
        request.tenant = tenant
        connection.set_tenant(request.tenant)
        self.setup_url_routing(request)
