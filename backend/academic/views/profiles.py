from rest_framework import viewsets, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, models
from django.db.models import Count, Q
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from ..models import Student, Teacher, Parent, AcademicClass, Section, Subject
from ..serializers import (
    TeacherSerializer,
    StudentListSerializer,
    StudentDetailSerializer,
    StudentCreateSerializer,
    StudentUpdateSerializer,
    ParentSerializer
)
from core.mixins import TenantScopedQuerysetMixin

from users.permissions import IsAdminOrSaaSAdmin
User = get_user_model()


class TeacherViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """ViewSet for managing Teachers"""
    queryset = Teacher.objects.select_related('user').prefetch_related('assigned_classes')
    serializer_class = TeacherSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'profile_overview']:
            return [IsAuthenticated()]
        return [IsAdminOrSaaSAdmin()]
    tenant_field = 'user__tenant'  # Teacher is related to tenant through user

    @action(detail=True, methods=['get'], url_path='profile-overview')
    def profile_overview(self, request, pk=None):
        """Return enriched teacher profile info for School Admin teacher management UI."""
        teacher = self.get_object()

        assigned_classes = list(teacher.assigned_classes.prefetch_related('sections').all())
        assigned_class_ids = {academic_class.id for academic_class in assigned_classes}

        subject_rows = []
        class_rows_map = {}

        subjects = (
            Subject.objects.filter(Q(teacher=teacher) | Q(additional_teachers=teacher))
            .select_related('academic_class')
            .prefetch_related('academic_class__sections')
            .annotate(
                total_lessons=Count('chapters__lessons', distinct=True),
                taught_lessons=Count(
                    'chapters__lessons',
                    filter=Q(chapters__lessons__is_published=True),
                    distinct=True,
                ),
            )
            .distinct()
        )

        for subject in subjects:
            class_obj = subject.academic_class
            class_id = class_obj.id
            section_names = [section.name for section in class_obj.sections.all()]

            role = 'lead_teacher' if subject.teacher_id == teacher.pk else 'additional_teacher'
            total_lessons = int(subject.total_lessons or 0)
            taught_lessons = int(subject.taught_lessons or 0)
            remaining_lessons = max(total_lessons - taught_lessons, 0)
            progress_percentage = round((taught_lessons / total_lessons) * 100, 1) if total_lessons else 0.0

            subject_rows.append({
                'subject_id': subject.id,
                'subject_name': subject.name,
                'subject_code': subject.code,
                'class_id': class_id,
                'class_name': class_obj.name,
                'section_names': section_names,
                'role': role,
                'total_lessons': total_lessons,
                'taught_lessons': taught_lessons,
                'remaining_lessons': remaining_lessons,
                'progress_percentage': progress_percentage,
            })

            class_entry = class_rows_map.setdefault(
                class_id,
                {
                    'class_id': class_id,
                    'class_name': class_obj.name,
                    'section_names': section_names,
                    'is_class_teacher': class_id in assigned_class_ids,
                    'is_subject_teacher': False,
                    'subjects': [],
                    'total_subjects': 0,
                    'total_lessons': 0,
                    'taught_lessons': 0,
                },
            )

            class_entry['is_subject_teacher'] = True
            class_entry['subjects'].append({
                'subject_id': subject.id,
                'subject_name': subject.name,
                'role': role,
            })
            class_entry['total_subjects'] += 1
            class_entry['total_lessons'] += total_lessons
            class_entry['taught_lessons'] += taught_lessons

        for academic_class in assigned_classes:
            class_rows_map.setdefault(
                academic_class.id,
                {
                    'class_id': academic_class.id,
                    'class_name': academic_class.name,
                    'section_names': [section.name for section in academic_class.sections.all()],
                    'is_class_teacher': True,
                    'is_subject_teacher': False,
                    'subjects': [],
                    'total_subjects': 0,
                    'total_lessons': 0,
                    'taught_lessons': 0,
                },
            )

        class_rows = []
        for class_entry in class_rows_map.values():
            total_lessons = int(class_entry['total_lessons'])
            taught_lessons = int(class_entry['taught_lessons'])
            remaining_lessons = max(total_lessons - taught_lessons, 0)
            progress_percentage = round((taught_lessons / total_lessons) * 100, 1) if total_lessons else 0.0

            roles = []
            if class_entry['is_class_teacher']:
                roles.append('class_teacher')
            if class_entry['is_subject_teacher']:
                roles.append('subject_teacher')

            class_rows.append({
                **class_entry,
                'roles': roles,
                'remaining_lessons': remaining_lessons,
                'progress_percentage': progress_percentage,
            })

        class_rows.sort(key=lambda row: row['class_name'].lower())
        subject_rows.sort(key=lambda row: (row['class_name'].lower(), row['subject_name'].lower()))

        total_lessons = sum(row['total_lessons'] for row in class_rows)
        taught_lessons = sum(row['taught_lessons'] for row in class_rows)
        remaining_lessons = max(total_lessons - taught_lessons, 0)

        summary = {
            'total_subjects': len(subject_rows),
            'total_classes': len(class_rows),
            'total_classes_as_class_teacher': sum(1 for row in class_rows if row['is_class_teacher']),
            'total_classes_as_subject_teacher': sum(1 for row in class_rows if row['is_subject_teacher']),
            'total_lessons': total_lessons,
            'taught_lessons': taught_lessons,
            'remaining_lessons': remaining_lessons,
            'progress_percentage': round((taught_lessons / total_lessons) * 100, 1) if total_lessons else 0.0,
        }

        full_name = f"{teacher.user.first_name} {teacher.user.last_name}".strip()

        return Response({
            'teacher_id': str(teacher.teacher_id),
            'teacher_name': full_name or teacher.user.username,
            'designation': teacher.designation,
            'subjects': subject_rows,
            'class_sections_progress': class_rows,
            'summary': summary,
        })


class StudentViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing Students
    
    list: Get all students
    retrieve: Get a specific student
    create: Create a new student with user account
    update: Update student profile
    partial_update: Partially update student profile
    destroy: Delete a student
    """
    queryset = Student.objects.select_related('user', 'academic_class', 'section').all()
    permission_classes = [IsAdminOrSaaSAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'user__username']
    ordering_fields = ['user__first_name', 'user__last_name', 'academic_class__name']
    ordering = ['user__first_name']
    tenant_field = 'user__tenant'  # Student is related to tenant through user
    
    def get_permissions(self):
        if self.action in ['me', 'list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminOrSaaSAdmin()]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return StudentListSerializer
        elif self.action == 'create':
            return StudentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return StudentUpdateSerializer
        return StudentDetailSerializer
    
    def get_queryset(self):
        """Filter queryset by tenant and apply filters"""
        queryset = super().get_queryset()
        
        # Filter by class
        class_id = self.request.query_params.get('class', None)
        if class_id:
            queryset = queryset.filter(academic_class_id=class_id)
        
        # Filter by section
        section_id = self.request.query_params.get('section', None)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current logged-in student's profile"""
        student = get_object_or_404(Student, user=request.user)
        serializer = self.get_serializer(student)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get student statistics"""
        queryset = self.get_queryset()
        
        total = queryset.count()
        by_class = {}
        
        for student in queryset.select_related('academic_class'):
            if student.academic_class:
                class_name = student.academic_class.name
                by_class[class_name] = by_class.get(class_name, 0) + 1
        
        avg_focus = queryset.aggregate(models.Avg('focus_score'))['focus_score__avg'] or 0
        
        return Response({
            'total': total,
            'by_class': by_class,
            'avg_focus_score': round(avg_focus, 2)
        })
    
    @action(detail=True, methods=['post'])
    def update_user(self, request, pk=None):
        """Update the user account details for a student"""
        student = self.get_object()
        user = student.user
        
        allowed_fields = ['first_name', 'last_name', 'email', 'phone_number', 'date_of_birth']
        
        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
        
        user.save()
        serializer = self.get_serializer(student)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Admin endpoint to reset a student's password"""
        student = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'error': 'new_password is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student.user.set_password(new_password)
        student.user.save()
        
        return Response({'message': 'Password reset successfully'})
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def import_data(self, request):
        """
        Import students from CSV/Excel file.
        expected columns: first_name, last_name, email, class, section
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from academic.services.bulk_import import BulkImportService
            service = BulkImportService()
            # Pass the file object to the service
            result = service.process_file(file_obj)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create students from a list
        Expected format:
        {
            "students": [
                {
                    "email": "...",
                    "password": "...",
                    "first_name": "...",
                    "last_name": "...",
                    "academic_class": <id>,
                    "section": <id>
                },
                ...
            ]
        }
        """
        students_data = request.data.get('students', [])
        
        if not students_data:
            return Response(
                {'error': 'students list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created = []
        errors = []
        
        for idx, student_data in enumerate(students_data):
            serializer = StudentCreateSerializer(data=student_data)
            if serializer.is_valid():
                try:
                    student = serializer.save()
                    created.append(StudentDetailSerializer(student).data)
                except Exception as e:
                    errors.append({'index': idx, 'error': str(e)})
            else:
                errors.append({'index': idx, 'errors': serializer.errors})
        
        return Response({
            'created': len(created),
            'failed': len(errors),
            'students': created,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)


class ParentViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Parents to view their profile and their students.
    """
    queryset = Parent.objects.select_related('user').prefetch_related('students__user', 'students__academic_class', 'students__section').all()
    serializer_class = ParentSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'user__tenant'

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current logged-in parent's profile"""
        parent = get_object_or_404(Parent, user=request.user)
        serializer = self.get_serializer(parent)
        return Response(serializer.data)
