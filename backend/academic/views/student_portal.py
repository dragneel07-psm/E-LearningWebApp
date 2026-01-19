from rest_framework import viewsets, permissions, filters
from django.db import models
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from academic.models import Attendance, Timetable, Notice, Result, Student, AcademicClass
from academic.serializers import AttendanceSerializer, TimetableSerializer, NoticeSerializer, ResultSerializer
import datetime
from core.mixins import TenantScopedQuerysetMixin

class StudentPortalViewSet(viewsets.GenericViewSet):
    """
    Unified ViewSet for Student Portal related operations to simplify API structure.
    Or we can use separate ViewSets. Let's use separate ViewSets for standard resources.
    """
    pass

class AttendanceViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'course', 'date', 'status']
    tenant_field = "student__user__tenant"

    def get_queryset(self):
        user = self.request.user
        # If user is student, only show their attendance
        if hasattr(user, 'student_profile'):
            queryset = Attendance.objects.filter(student=user.student_profile)
            return self.filter_queryset_by_tenant(queryset)
        # If teacher, show attendance for their classes (logic simplified for now)
        return super().get_queryset()

class TimetableViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['academic_class', 'day_of_week']
    tenant_field = "academic_class__tenant"
    
    @action(detail=False, methods=['get'])
    def my_timetable(self, request):
        """Get timetable for the logged-in student's class"""
        user = request.user
        if hasattr(user, 'student_profile'):
            student_class = user.student_profile.academic_class
            timetable = Timetable.objects.filter(academic_class=student_class)
            serializer = self.get_serializer(timetable, many=True)
            return Response(serializer.data)
        return Response({"error": "Not a student"}, status=400)

class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Filter logic: Show notices that are:
        # 1. 'school' wide
        # 2. targeted to the user's class
        # 3. targeted specifically to the user (student)
        user = self.request.user
        qs = super().get_queryset()
        
        if hasattr(user, 'student_profile'):
            student_profile = user.student_profile
            student_class = student_profile.academic_class
            return qs.filter(
                models.Q(target_audience='school') | 
                models.Q(target_audience='class', target_class=student_class) |
                models.Q(target_audience='student', target_student=student_profile)
            )
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        
        # Student cannot create
        if hasattr(user, 'student_profile'):
             raise permissions.PermissionDenied("Students cannot create notices.")
             
        # Teacher restrictions
        if hasattr(user, 'teacher_profile'):
            # Enforce that teachers can only create class-specific or student-specific notices
            audience = serializer.validated_data.get('target_audience')
            target_class = serializer.validated_data.get('target_class')
            target_student = serializer.validated_data.get('target_student')
            
            if audience == 'class' and not target_class:
                 raise permissions.PermissionDenied("Target class is required for class notices.")
            
            if audience == 'student' and not target_student:
                 raise permissions.PermissionDenied("Target student is required for student notices.")
                 
            if audience == 'school':
                raise permissions.PermissionDenied("Teachers cannot create school-wide notices.")
            
            # Ideally check if target_class is in teacher.assigned_classes or if target_student is in their class
            
            serializer.save() 
            return

        # Admin
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance
        
        if hasattr(user, 'teacher_profile'):
            # Teacher can only edit if it was targeted to a class/student
            if instance.target_audience == 'school':
                raise permissions.PermissionDenied("You cannot edit school-wide notices.")
                
            # Also prevent changing it to school-wide
            new_audience = serializer.validated_data.get('target_audience', instance.target_audience)
            if new_audience == 'school':
                 raise permissions.PermissionDenied("You cannot change a notice to be school-wide.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if hasattr(user, 'teacher_profile'):
            if instance.target_audience == 'school':
                raise permissions.PermissionDenied("You cannot delete school-wide notices.")
        
        instance.delete()


class ResultViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'assessment']
    tenant_field = "student__user__tenant"

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'student_profile'):
            queryset = Result.objects.filter(student=user.student_profile)
            return self.filter_queryset_by_tenant(queryset)
        return super().get_queryset()
