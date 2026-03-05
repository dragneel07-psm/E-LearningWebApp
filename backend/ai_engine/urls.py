from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.AIInteractionLogViewSet)
router.register(r'reports', views.StudentAIReportViewSet, basename='student-reports')
router.register(r'learning-paths', views.LearningPathViewSet, basename='learning-paths')
router.register(r'learning-nodes', views.LearningNodeViewSet, basename='learning-nodes')
router.register(r'study-schedule', views.StudyEventViewSet, basename='study-schedule')

urlpatterns = [
    path('', include(router.urls)),
    path("artifacts/", views.ai_generated_artifacts, name="ai_generated_artifacts"),
    path("exams/generate/", views.ai_exam_generate, name="ai_exam_generate"),
    path("quizzes/generate/", views.ai_quiz_generate, name="ai_quiz_generate"),
    path("lessons/<int:lesson_id>/summarize/", views.ai_lesson_summarize, name="ai_lesson_summarize"),
    path("lessons/<int:lesson_id>/exam_notes/", views.ai_lesson_exam_notes, name="ai_lesson_exam_notes"),
    path('jobs/index-content/', views.enqueue_ai_index_content, name='ai_enqueue_index_content'),
    path('jobs/summaries/', views.enqueue_ai_summary, name='ai_enqueue_summary'),
    path('jobs/quizzes/', views.enqueue_ai_quiz, name='ai_enqueue_quiz'),
    path('tutor/chat/', views.ai_tutor_chat, name='ai_tutor_chat'),
    path('analytics/teacher/', views.teacher_analytics, name='teacher_analytics'),
    path('personalization/recommendations/', views.student_recommendations, name='student_recommendations'),
    path('reports/student/<uuid:student_id>/', views.student_report, name='student_report_generate'),
    path('reports/student/<uuid:student_id>/history/', views.student_past_reports, name='student_report_history'),
]
