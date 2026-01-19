from .student_portal import AttendanceViewSet, TimetableViewSet, NoticeViewSet, ResultViewSet as SPResultViewSet
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.db.models import Q
from core.mixins import TenantScopedQuerysetMixin
from ..models import AcademicClass, Student, Teacher, Parent, Course, Lesson, Assessment, Result, Submission, Question
from ..serializers import (
    AcademicClassSerializer, StudentSerializer, TeacherSerializer, ParentSerializer,
    CourseSerializer, LessonSerializer, AssessmentSerializer, ResultSerializer, SubmissionSerializer, QuestionSerializer
)

class AcademicClassViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = AcademicClass.objects.all()
    serializer_class = AcademicClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Auto-assign tenant from user
        serializer.save(tenant=self.request.user.tenant)

class StudentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    tenant_field = "user__tenant"

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Student.objects.none()

        # Admin/Principal sees all
        if user.is_staff or getattr(user, 'role', '') == 'admin':
            queryset = Student.objects.all()
            return self.filter_queryset_by_tenant(queryset)

        if getattr(user, 'role', '') == 'teacher':
             # Ensure profile exists
             if not hasattr(user, 'teacher_profile'):
                 return Student.objects.none()
             
             teacher = user.teacher_profile
             # Teachers see students if:
             # 1. They are in a class explicitly assigned to the teacher (assigned_classes)
             # 2. OR they are in a class where the teacher teaches a course
             queryset = Student.objects.filter(
                 Q(academic_class__in=teacher.assigned_classes.all()) | 
                 Q(academic_class__courses__teacher=teacher)
             ).distinct()
             return self.filter_queryset_by_tenant(queryset)

        if getattr(user, 'role', '') == 'student':
            queryset = Student.objects.filter(user=user)
            return self.filter_queryset_by_tenant(queryset)

        # Fallback/Parent logic (to be implemented or kept strict)
        return Student.objects.none()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current user's student profile"""
        user = request.user
        if not user.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=401)
        
        if getattr(user, 'role', '') != 'student':
            return Response({'error': 'User is not a student'}, status=400)
        
        try:
            student = Student.objects.get(user=user)
            serializer = self.get_serializer(student)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

class TeacherViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    serializer_class = TeacherSerializer
    tenant_field = "user__tenant"

class ParentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Parent.objects.all()
    serializer_class = ParentSerializer

class CourseViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    tenant_field = "academic_class__tenant"

class LessonViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    tenant_field = "course__academic_class__tenant"

class AssessmentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    tenant_field = "course__academic_class__tenant"

class ResultViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    tenant_field = "student__user__tenant"

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from ai_engine.services.grading_service import grading_service

# ... existing imports ...

class SubmissionViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    tenant_field = "student__user__tenant"

    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        submission = self.get_object()
        
        if not submission.content:
            return Response({'error': 'No content to grade'}, status=status.HTTP_400_BAD_REQUEST)

        # Get total points from assessment
        total_points = submission.assessment.total_marks
        
        # Grade using AI
        # Construct question context from assessment title/description
        question_text = f"{submission.assessment.title}: {submission.assessment.description}"
        
        # Mock correct answer for now since Assessment doesn't hold it for essays strictly
        # In real app, Assessment model would have rubric
        grading_result = grading_service.grade_submission(
            question_text=question_text,
            student_answer=submission.content,
            total_points=total_points
        )
        
        # Create/Update Result
        Result.objects.update_or_create(
            assessment=submission.assessment,
            student=submission.student,
            defaults={
                'score': grading_result['score'],
                'ai_feedback': grading_result['feedback'],
                'time_taken_minutes': 0 # Unknown for assignments
            }
        )
        
        # Update Submission
        submission.status = 'graded'
        submission.is_graded = True
        submission.save()
        
        return Response(grading_result)

class QuestionViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    tenant_field = "assessment__course__academic_class__tenant"
