from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicClassViewSet, StudentViewSet, TeacherViewSet, ParentViewSet,
    CourseViewSet, LessonViewSet, AssessmentViewSet, ResultViewSet, SubmissionViewSet, QuestionViewSet,
    AttendanceViewSet, TimetableViewSet, NoticeViewSet
)

router = DefaultRouter()
router.register(r'classes', AcademicClassViewSet)
router.register(r'students', StudentViewSet)
router.register(r'teachers', TeacherViewSet)
router.register(r'parents', ParentViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'assessments', AssessmentViewSet)
router.register(r'results', ResultViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'timetable', TimetableViewSet)
router.register(r'notices', NoticeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
