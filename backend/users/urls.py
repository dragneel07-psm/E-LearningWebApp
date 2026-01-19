from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserAccountViewSet, GroupViewSet, PermissionViewSet, 
    AdminPasswordResetView, register_user, CustomTokenObtainPairView
)

router = DefaultRouter()
router.register(r'accounts', UserAccountViewSet)
router.register(r'groups', GroupViewSet)
router.register(r'permissions', PermissionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', register_user, name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('admin/reset-password/', AdminPasswordResetView.as_view(), name='admin-password-reset'),
]
