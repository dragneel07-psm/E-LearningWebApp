from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserAccountViewSet, GroupViewSet, PermissionViewSet, AdminPasswordResetView, register_user

router = DefaultRouter()
router.register(r'accounts', UserAccountViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'permissions', PermissionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', register_user, name='register'),
    path('admin/reset-password/', AdminPasswordResetView.as_view(), name='admin-password-reset'),
]
