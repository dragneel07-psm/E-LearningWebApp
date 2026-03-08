from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserAccountViewSet, GroupViewSet, PermissionViewSet, 
    AdminPasswordResetView, register_user, CustomTokenObtainPairView, CustomTokenRefreshView,
    PasswordResetView, PasswordResetConfirmView, EmailVerificationView
)

router = DefaultRouter()
router.register(r'accounts', UserAccountViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'permissions', PermissionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', register_user, name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('admin/reset-password/', AdminPasswordResetView.as_view(), name='admin-password-reset'),
    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('verify-email/', EmailVerificationView.as_view(), name='verify_email'),
]
