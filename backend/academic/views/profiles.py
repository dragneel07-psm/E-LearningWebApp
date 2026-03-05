from rest_framework import viewsets, status, filters
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, models
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from ..models import Student, Teacher, Parent, AcademicClass, AcademicYear, Section, Subject
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
from ..services.academic_year_service import ensure_current_academic_year
User = get_user_model()


def _find_academic_year(raw_year):
    if raw_year is None or raw_year == '':
        return None
    if isinstance(raw_year, AcademicYear):
        return raw_year
    if str(raw_year).isdigit():
        return AcademicYear.objects.filter(pk=int(raw_year)).first()
    return AcademicYear.objects.filter(name=str(raw_year)).first()


def _resolve_requested_year(request):
    raw_year = request.query_params.get('academic_year')
    if raw_year:
        return _find_academic_year(raw_year), True
    return ensure_current_academic_year(), False


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
        requested_year, has_year_filter = _resolve_requested_year(request)
        if has_year_filter and not requested_year:
            return Response({'detail': 'Academic year not found.'}, status=status.HTTP_404_NOT_FOUND)

        subjects_qs = Subject.objects.filter(Q(teacher=teacher) | Q(additional_teachers=teacher))
        if requested_year:
            subjects_qs = subjects_qs.filter(academic_year=requested_year)

        subjects = (
            subjects_qs
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
        if self.action in ['me', 'list', 'retrieve', 'profile_overview']:
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

    @action(detail=True, methods=['get'], url_path='profile-overview')
    def profile_overview(self, request, pk=None):
        """
        Enriched student profile view for Admin/Teacher dashboards.
        Includes subject progress, results, assignments, and overall analytics.
        """
        student = self.get_object()
        requester_role = getattr(request.user, 'role', None)

        if requester_role in ['admin', 'saas_admin', 'staff']:
            pass
        # Students can only view their own profile.
        elif requester_role == 'student':
            if student.user_id != request.user.user_id:
                return Response({'detail': 'You can only view your own profile.'}, status=status.HTTP_403_FORBIDDEN)
        # Teachers can only view students from their assigned classes.
        elif requester_role == 'teacher':
            teacher_profile = Teacher.objects.prefetch_related('assigned_classes').filter(user=request.user).first()
            student_class_id = getattr(student, 'academic_class_id', None)
            if not teacher_profile or not student_class_id:
                return Response({'detail': 'Not allowed to view this student profile.'}, status=status.HTTP_403_FORBIDDEN)
            assigned_class_ids = set(teacher_profile.assigned_classes.values_list('id', flat=True))
            if student_class_id not in assigned_class_ids:
                return Response({'detail': 'Not allowed to view this student profile.'}, status=status.HTTP_403_FORBIDDEN)
        # Parents can only view linked students.
        elif requester_role == 'parent':
            parent_profile = Parent.objects.prefetch_related('students').filter(user=request.user).first()
            if not parent_profile or not parent_profile.students.filter(student_id=student.student_id).exists():
                return Response({'detail': 'Not allowed to view this student profile.'}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({'detail': 'Not allowed to view this student profile.'}, status=status.HTTP_403_FORBIDDEN)

        from ..models import Subject
        from ..models.lesson import Lesson, LessonProgress
        from ..models.assessment import Assessment, Result
        from ..models.submission import Submission
        requested_year, has_year_filter = _resolve_requested_year(request)
        if has_year_filter and not requested_year:
            return Response({'detail': 'Academic year not found.'}, status=status.HTTP_404_NOT_FOUND)

        subjects = []
        if student.academic_class_id:
            subjects_qs = Subject.objects.filter(academic_class_id=student.academic_class_id)
            if requested_year:
                subjects_qs = subjects_qs.filter(academic_year=requested_year)

            subjects = list(
                subjects_qs
                .select_related('academic_class')
                .order_by('name')
            )

        subject_ids = [subject.id for subject in subjects]

        lesson_total_map = {}
        completed_lesson_map = {}
        if subject_ids:
            lesson_total_map = {
                row['chapter__subject_id']: row['total_lessons']
                for row in Lesson.objects.filter(chapter__subject_id__in=subject_ids)
                .values('chapter__subject_id')
                .annotate(total_lessons=Count('id'))
            }

            completed_lesson_map = {
                row['lesson__chapter__subject_id']: row['completed_lessons']
                for row in LessonProgress.objects.filter(
                    student=student,
                    completed=True,
                    lesson__chapter__subject_id__in=subject_ids,
                )
                .values('lesson__chapter__subject_id')
                .annotate(completed_lessons=Count('id', distinct=True))
            }

        assessments = []
        if subject_ids:
            assessments_qs = Assessment.objects.filter(subject_id__in=subject_ids).select_related('subject')
            if requested_year:
                assessments_qs = assessments_qs.filter(academic_year=requested_year)
            if student.section_id:
                assessments_qs = assessments_qs.filter(Q(section_id=student.section_id) | Q(section__isnull=True))
            else:
                assessments_qs = assessments_qs.filter(section__isnull=True)
            assessments = list(assessments_qs.order_by('due_date', 'scheduled_at', 'assessment_id'))

        assessment_ids = [assessment.assessment_id for assessment in assessments]

        results = []
        submissions = []
        if assessment_ids:
            results = list(
                Result.objects.filter(student=student, assessment_id__in=assessment_ids)
                .select_related('assessment', 'assessment__subject')
                .order_by('-submitted_at')
            )
            submissions = list(
                Submission.objects.filter(student=student, assessment_id__in=assessment_ids)
                .select_related('assessment', 'assessment__subject')
                .order_by('-submitted_at')
            )

        assessments_by_subject = {}
        for assessment in assessments:
            assessments_by_subject.setdefault(assessment.subject_id, []).append(assessment)

        results_by_subject = {}
        for result in results:
            results_by_subject.setdefault(result.assessment.subject_id, []).append(result)

        submissions_by_subject = {}
        for submission in submissions:
            submissions_by_subject.setdefault(submission.assessment.subject_id, []).append(submission)

        submission_by_assessment = {str(submission.assessment_id): submission for submission in submissions}
        result_by_assessment = {str(result.assessment_id): result for result in results}

        subject_progress = []
        subject_average_scores = []
        for subject in subjects:
            total_lessons = int(lesson_total_map.get(subject.id, 0))
            completed_lessons = int(completed_lesson_map.get(subject.id, 0))
            progress_percentage = round((completed_lessons / total_lessons) * 100, 1) if total_lessons else 0.0

            subject_assessments = assessments_by_subject.get(subject.id, [])
            subject_results = results_by_subject.get(subject.id, [])

            result_percentages = [
                (float(result.score) / float(result.assessment.total_marks) * 100)
                for result in subject_results
                if result.assessment.total_marks
            ]
            average_score_percentage = round(sum(result_percentages) / len(result_percentages), 1) if result_percentages else 0.0

            assignment_assessments = [assessment for assessment in subject_assessments if assessment.type == 'assignment']
            assignment_total = len(assignment_assessments)
            assignment_submitted = 0
            for assignment in assignment_assessments:
                submission = submission_by_assessment.get(str(assignment.assessment_id))
                submission_done = submission and submission.status in ['submitted', 'graded', 'late']
                result_done = str(assignment.assessment_id) in result_by_assessment
                if submission_done or result_done:
                    assignment_submitted += 1
            assignment_pending = max(assignment_total - assignment_submitted, 0)

            completed_assessment_ids = {
                str(result.assessment_id)
                for result in subject_results
            }
            completed_assessment_ids.update(
                str(submission.assessment_id)
                for submission in submissions_by_subject.get(subject.id, [])
                if submission.status in ['submitted', 'graded', 'late']
            )

            latest_result_payload = None
            if subject_results:
                latest = subject_results[0]
                latest_percentage = round((float(latest.score) / float(latest.assessment.total_marks)) * 100, 1) if latest.assessment.total_marks else 0.0
                latest_result_payload = {
                    'assessment_id': str(latest.assessment.assessment_id),
                    'assessment_title': latest.assessment.title,
                    'type': latest.assessment.type,
                    'score': latest.score,
                    'total_marks': latest.assessment.total_marks,
                    'percentage': latest_percentage,
                    'submitted_at': latest.submitted_at.isoformat() if latest.submitted_at else None,
                }

            subject_progress.append({
                'subject_id': subject.id,
                'subject_name': subject.name,
                'subject_code': subject.code,
                'class_name': subject.academic_class.name if subject.academic_class_id else None,
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'progress_percentage': progress_percentage,
                'assessments_total': len(subject_assessments),
                'assessments_completed': len(completed_assessment_ids),
                'assignment_total': assignment_total,
                'assignment_submitted': assignment_submitted,
                'assignment_pending': assignment_pending,
                'average_score_percentage': average_score_percentage,
                'latest_result': latest_result_payload,
            })

            subject_average_scores.append({
                'subject_id': subject.id,
                'subject_name': subject.name,
                'average_score_percentage': average_score_percentage,
                'progress_percentage': progress_percentage,
            })

        subject_progress.sort(key=lambda item: item['subject_name'].lower())

        recent_results = []
        for result in results[:12]:
            total_marks = result.assessment.total_marks or 0
            percentage = round((float(result.score) / float(total_marks) * 100), 1) if total_marks else 0.0
            recent_results.append({
                'result_id': str(result.result_id),
                'assessment_id': str(result.assessment.assessment_id),
                'assessment_title': result.assessment.title,
                'assessment_type': result.assessment.type,
                'subject_id': result.assessment.subject_id,
                'subject_name': result.assessment.subject.name,
                'score': result.score,
                'total_marks': total_marks,
                'percentage': percentage,
                'submitted_at': result.submitted_at.isoformat() if result.submitted_at else None,
                'teacher_feedback': result.teacher_feedback,
            })

        assignments = []
        now = timezone.now()
        for assessment in assessments:
            if assessment.type != 'assignment':
                continue

            submission = submission_by_assessment.get(str(assessment.assessment_id))
            result = result_by_assessment.get(str(assessment.assessment_id))

            status_value = 'pending'
            if submission and submission.status:
                status_value = submission.status
            elif result:
                status_value = 'graded'
            elif assessment.due_date and assessment.due_date < now:
                status_value = 'late'

            percentage = 0.0
            if result and assessment.total_marks:
                percentage = round((float(result.score) / float(assessment.total_marks) * 100), 1)

            assignments.append({
                'assessment_id': str(assessment.assessment_id),
                'title': assessment.title,
                'subject_id': assessment.subject_id,
                'subject_name': assessment.subject.name,
                'due_date': assessment.due_date.isoformat() if assessment.due_date else None,
                'status': status_value,
                'submitted_at': submission.submitted_at.isoformat() if submission and submission.submitted_at else None,
                'is_graded': bool(result),
                'score': result.score if result else None,
                'total_marks': assessment.total_marks,
                'percentage': percentage if result else None,
            })

        assignments.sort(
            key=lambda item: (
                item['due_date'] is None,
                item['due_date'] or '',
                item['title'].lower(),
            )
        )

        total_subjects = len(subjects)
        total_lessons = sum(item['total_lessons'] for item in subject_progress)
        completed_lessons = sum(item['completed_lessons'] for item in subject_progress)
        overall_progress_percentage = round((completed_lessons / total_lessons) * 100, 1) if total_lessons else 0.0

        total_assessments = len(assessments)
        completed_assessments = len(
            {
                *[
                    str(result.assessment_id)
                    for result in results
                ],
                *[
                    str(submission.assessment_id)
                    for submission in submissions
                    if submission.status in ['submitted', 'graded', 'late']
                ],
            }
        )

        total_assignments = len(assignments)
        submitted_assignments = sum(1 for item in assignments if item['status'] in ['submitted', 'graded', 'late'])
        graded_assignments = sum(1 for item in assignments if item['is_graded'])
        pending_assignments = max(total_assignments - submitted_assignments, 0)

        overall_average_score = 0.0
        if recent_results:
            score_points = [item['percentage'] for item in recent_results]
            overall_average_score = round(sum(score_points) / len(score_points), 1)

        scored_subjects = [item for item in subject_average_scores if item['average_score_percentage'] > 0]
        best_subject = None
        weakest_subject = None
        if scored_subjects:
            sorted_by_score = sorted(scored_subjects, key=lambda item: item['average_score_percentage'])
            weakest_subject = sorted_by_score[0]
            best_subject = sorted_by_score[-1]

        needs_attention_subjects = [
            item['subject_name']
            for item in subject_average_scores
            if item['progress_percentage'] < 50 or (item['average_score_percentage'] > 0 and item['average_score_percentage'] < 50)
        ]

        focus_score = student.focus_score or 0
        current_streak = student.current_streak or 0
        if focus_score >= 80 and current_streak >= 7:
            momentum_label = 'excellent'
        elif focus_score >= 60 and current_streak >= 3:
            momentum_label = 'steady'
        else:
            momentum_label = 'needs_support'

        response_payload = {
            'student': {
                'id': str(student.student_id),
                'user_id': str(student.user.user_id),
                'first_name': student.user.first_name,
                'last_name': student.user.last_name,
                'email': student.user.email,
                'class_id': student.academic_class_id,
                'class_name': student.academic_class.name if student.academic_class_id else None,
                'section_id': student.section_id,
                'section_name': student.section.name if student.section_id else None,
                'learning_style': student.learning_style,
                'daily_study_goal': student.daily_study_goal,
                'focus_score': student.focus_score,
                'current_streak': student.current_streak,
                'total_minutes_learned': student.total_minutes_learned,
            },
            'overall': {
                'total_subjects': total_subjects,
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'progress_percentage': overall_progress_percentage,
                'total_assessments': total_assessments,
                'completed_assessments': completed_assessments,
                'total_assignments': total_assignments,
                'submitted_assignments': submitted_assignments,
                'pending_assignments': pending_assignments,
                'graded_assignments': graded_assignments,
                'average_score_percentage': overall_average_score,
            },
            'subject_progress': subject_progress,
            'recent_results': recent_results,
            'assignments': assignments,
            'analytics': {
                'best_subject': best_subject,
                'weakest_subject': weakest_subject,
                'needs_attention_subjects': needs_attention_subjects,
                'momentum_label': momentum_label,
            },
        }

        return Response(response_payload)
    
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
