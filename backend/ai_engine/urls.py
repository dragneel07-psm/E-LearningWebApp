from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.AIInteractionLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('tutor/chat/', views.ai_tutor_chat, name='ai_tutor_chat'),
    path('personalization/recommendations/', views.student_recommendations, name='student_recommendations'),
    path('analytics/teacher/', views.teacher_analytics, name='teacher_analytics'),
    path('reports/student/<uuid:student_id>/', views.student_report, name='student_report'),
    path('reports/student/<uuid:student_id>/history/', views.student_past_reports, name='student_past_reports'),
]
