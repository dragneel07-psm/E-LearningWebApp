from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, AuditLogViewSet, SystemStatusView, GlobalSettingsViewSet, TenantCheckView, BackupViewSet
from .views_saas import SaasKPIView, SaasAIUsageView

router = DefaultRouter()
router.register(r'tenants', TenantViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'settings', GlobalSettingsViewSet, basename='settings')
router.register(r'backups', BackupViewSet, basename='backups')

urlpatterns = [
    path('', include(router.urls)),
    path('system-status/', SystemStatusView.as_view(), name='system-status'),
    path('tenant-check/', TenantCheckView.as_view(), name='tenant-check'),
    path('saas-kpi/', SaasKPIView.as_view(), name='saas-kpi'),
    path('saas-ai-usage/', SaasAIUsageView.as_view(), name='saas-ai-usage'),
]
