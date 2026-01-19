from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class TenantEnforcementMiddleware(MiddlewareMixin):
    """
    Enforce that authenticated tenant users are routed through the correct tenant context.
    """

    TENANT_REQUIRED_PREFIXES = (
        "/api/academic/",
        "/api/library/",
        "/api/ai/",
        "/api/notifications/",
        "/api/billing/",
        "/api/users/",
    )
    EXEMPT_PREFIXES = ("/admin/", "/api/core/")
    EXEMPT_PATHS = (
        "/api/token/",
        "/api/token/refresh/",
    )

    def process_request(self, request):
        path = request.path
        if path.startswith(self.EXEMPT_PREFIXES) or path in self.EXEMPT_PATHS:
            return None

        if not path.startswith("/api/"):
            return None

        if not path.startswith(self.TENANT_REQUIRED_PREFIXES):
            return None

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return None

        user_tenant = getattr(user, "tenant", None)
        request_tenant = getattr(request, "tenant", None)

        if user_tenant:
            if not request_tenant:
                return JsonResponse(
                    {"detail": "Tenant context missing for authenticated user."},
                    status=400,
                )
            if request_tenant != user_tenant:
                return JsonResponse(
                    {"detail": "Tenant mismatch for authenticated user."},
                    status=403,
                )
        elif request_tenant and not (user.is_staff or user.is_superuser):
            return JsonResponse(
                {"detail": "Tenant context required for this user."},
                status=403,
            )

        return None
