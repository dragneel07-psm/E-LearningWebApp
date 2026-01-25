from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicYearViewSet, AcademicClassViewSet, SectionViewSet, 
    SubjectViewSet, TeacherViewSet, StudentViewSet, 
    ChapterViewSet, LessonViewSet, LessonMaterialViewSet,
    AssessmentViewSet, QuestionViewSet, SubmissionViewSet, ResultViewSet, ParentViewSet,
    AttendanceViewSet, TimetableViewSet, NoticeViewSet, ReportViewSet
)
from .views.stats import AcademicStatsView

router = DefaultRouter()
router.register(r'years', AcademicYearViewSet) # /api/academic/years/
router.register(r'classes', AcademicClassViewSet) # /api/academic/classes/
router.register(r'sections', SectionViewSet) # /api/academic/sections/
router.register(r'subjects', SubjectViewSet) # /api/academic/subjects/
router.register(r'teachers', TeacherViewSet) # /api/academic/teachers/
router.register(r'students', StudentViewSet) # /api/academic/students/
router.register(r'chapters', ChapterViewSet) # /api/academic/chapters/
router.register(r'lessons', LessonViewSet) # /api/academic/lessons/
router.register(r'materials', LessonMaterialViewSet) # /api/academic/materials/
router.register(r'assessments', AssessmentViewSet)
router.register(r'questions', QuestionViewSet)
router.register(r'submissions', SubmissionViewSet)
router.register(r'results', ResultViewSet)
router.register(r'parents', ParentViewSet)
router.register(r'attendance', AttendanceViewSet)
router.register(r'timetable', TimetableViewSet)
router.register(r'notices', NoticeViewSet)
router.register(r'reports', ReportViewSet, basename='reports')

urlpatterns = [
    path('stats/', AcademicStatsView.as_view(), name='academic-stats'),
    path('', include(router.urls)),
]
