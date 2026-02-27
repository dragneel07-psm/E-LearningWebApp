"""
core/middleware.py
──────────────────
Custom tenant middleware that resolves the tenant from:
  1. Host header  (standard django-tenants subdomain routing), OR
  2. 'x-tenant-id' request header (for API clients on localhost)

This allows the React frontend and mobile app running on localhost:3000 to
send 'x-tenant-id: demo' and have all requests routed to the correct schema.
"""

from django_tenants.middleware.main import TenantMainMiddleware
from django_tenants.utils import get_tenant_domain_model
from django.db import connection


class TenantFromHeaderMiddleware(TenantMainMiddleware):
    """
    Extends django-tenants' standard middleware with an 'x-tenant-id' header fallback.

    Lookup order:
      1. Domain match  (demo.localhost  → demo schema)
      2. x-tenant-id header  (Header: x-tenant-id: demo  → demo schema)
      3. Fall through to no_tenant_found() as usual
    """

    def process_request(self, request):
        """
        Override to inject x-tenant-id into the resolution before the parent
        processes it. We do this by temporarily faking the HOST header when
        we detect a x-tenant-id header and the real hostname won't resolve.
        """
        # Always reset to public schema first (same as parent)
        connection.set_schema_to_public()

        hostname = self.hostname_from_request(request)
        domain_model = get_tenant_domain_model()

        # Try normal hostname resolution
        try:
            tenant = self.get_tenant(domain_model, hostname)
        except domain_model.DoesNotExist:
            # Hostname didn't resolve — try x-tenant-id header
            tenant_id = (
                request.META.get('HTTP_X_TENANT_ID', '')
                or request.headers.get('x-tenant-id', '')
            ).strip().lower()

            if tenant_id:
                try:
                    domain = domain_model.objects.select_related('tenant').filter(
                        tenant__schema_name=tenant_id
                    ).first()
                    if domain:
                        tenant = domain.tenant
                    else:
                        return self.no_tenant_found(request, hostname)
                except Exception:
                    return self.no_tenant_found(request, hostname)
            else:
                return self.no_tenant_found(request, hostname)

        tenant.domain_url = hostname
        request.tenant = tenant
        connection.set_tenant(request.tenant)
        self.setup_url_routing(request)
