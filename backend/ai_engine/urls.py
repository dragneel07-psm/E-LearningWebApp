from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.AIInteractionLogViewSet)
router.register(r'reports', views.StudentAIReportViewSet, basename='student-reports')
router.register(r'learning-paths', views.LearningPathViewSet, basename='learning-paths')
router.register(r'learning-nodes', views.LearningNodeViewSet, basename='learning-nodes')

urlpatterns = [
    path('', include(router.urls)),
    path('tutor/chat/', views.ai_tutor_chat, name='ai_tutor_chat'),
    path('analytics/teacher/', views.teacher_analytics, name='teacher_analytics'),
    path('personalization/recommendations/', views.student_recommendations, name='student_recommendations'),
    path('reports/student/<uuid:student_id>/', views.student_report, name='student_report_generate'),
    path('reports/student/<uuid:student_id>/history/', views.student_past_reports, name='student_report_history'),
]
