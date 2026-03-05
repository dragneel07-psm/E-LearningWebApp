from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TenantViewSet,
    AuditLogViewSet,
    SystemStatusView,
    GlobalSettingsViewSet,
    TenantCheckView,
    BackupViewSet,
    TenantCapabilitiesView,
    HealthzView,
    ReadyzView,
)
from .views_saas import (
    SaasKPIView,
    SaasAIUsageView,
    TenantAdminPasswordResetView,
    TenantUsersView,
    TenantUserDetailView,
    TenantUserPasswordResetView,
)

router = DefaultRouter()
router.register(r'tenants', TenantViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'settings', GlobalSettingsViewSet, basename='settings')
router.register(r'backups', BackupViewSet, basename='backups')

urlpatterns = [
    path('', include(router.urls)),
    path('healthz/', HealthzView.as_view(), name='healthz'),
    path('readyz/', ReadyzView.as_view(), name='readyz'),
    path('system-status/', SystemStatusView.as_view(), name='system-status'),
    path('tenant-check/', TenantCheckView.as_view(), name='tenant-check'),
    path('capabilities/', TenantCapabilitiesView.as_view(), name='tenant-capabilities'),
    path('saas-kpi/', SaasKPIView.as_view(), name='saas-kpi'),
    path('saas-ai-usage/', SaasAIUsageView.as_view(), name='saas-ai-usage'),
    path('reset-admin-password/', TenantAdminPasswordResetView.as_view(), name='reset-admin-password'),
    path('tenants/<str:tenant_id>/users/', TenantUsersView.as_view(), name='tenant-users'),
    path('tenants/<str:tenant_id>/users/<str:user_id>/', TenantUserDetailView.as_view(), name='tenant-user-detail'),
    path('tenants/<str:tenant_id>/users/<str:user_id>/reset-password/', TenantUserPasswordResetView.as_view(), name='tenant-user-password-reset'),
]
