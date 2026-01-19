from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, AuditLogViewSet, SystemStatusView, GlobalSettingsViewSet, TenantCheckView

router = DefaultRouter()
router.register(r'tenants', TenantViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'settings', GlobalSettingsViewSet, basename='settings')

urlpatterns = [
    path('', include(router.urls)),
    path('system-status/', SystemStatusView.as_view(), name='system-status'),
    path('tenant-check/', TenantCheckView.as_view(), name='tenant-check'),
]
