from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationTemplateViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')

urlpatterns = [
    path('dispatch/', NotificationViewSet.as_view({'post': 'enqueue_notification'}), name='notification-dispatch'),
    path('', include(router.urls)),
]
