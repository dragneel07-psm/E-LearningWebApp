from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.AIInteractionLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('tutor/chat/', views.ai_tutor_chat, name='ai_tutor_chat'),
]
