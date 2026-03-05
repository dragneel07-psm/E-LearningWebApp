from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import AcademicYear, AcademicClass, Section, Subject
from ..serializers import AcademicYearSerializer, AcademicClassSerializer, SectionSerializer, SubjectSerializer
from ..services.academic_year_service import (
    YearRolloverOptions,
    create_next_academic_year,
    ensure_current_academic_year,
    rollover_academic_year,
)

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ensure_current_academic_year()
        return AcademicYear.objects.all().order_by('-start_date')

    def _is_year_manager(self, user):
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'role', None) in ['admin', 'staff', 'management', 'saas_admin']
        )

    def _to_bool(self, value, default=False):
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {'1', 'true', 'yes', 'on'}
        return bool(value)

    @action(detail=False, methods=['get'])
    def current(self, request):
        current_year = ensure_current_academic_year()
        if not current_year:
            return Response({'detail': 'No academic year configured.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(self.get_serializer(current_year).data)

    @action(detail=False, methods=['post'])
    def rollover(self, request):
        if not self._is_year_manager(request.user):
            return Response(
                {'detail': 'Only admin/management can run academic year rollover.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        source_year_id = request.data.get('source_year')
        target_year_id = request.data.get('target_year')

        source_year = None
        if source_year_id:
            source_year = AcademicYear.objects.filter(pk=source_year_id).first()
        if not source_year:
            source_year = ensure_current_academic_year()
        if not source_year:
            return Response({'detail': 'Source academic year not found.'}, status=status.HTTP_400_BAD_REQUEST)

        target_year = None
        if target_year_id:
            target_year = AcademicYear.objects.filter(pk=target_year_id).first()
            if not target_year:
                return Response({'detail': 'Target academic year not found.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_payload = request.data.get('target') if isinstance(request.data.get('target'), dict) else {}
            target_name = request.data.get('name') or target_payload.get('name')
            target_start_date = request.data.get('start_date') or target_payload.get('start_date')
            target_end_date = request.data.get('end_date') or target_payload.get('end_date')
            parsed_start = parse_date(target_start_date) if target_start_date else None
            parsed_end = parse_date(target_end_date) if target_end_date else None

            if target_start_date and parsed_start is None:
                return Response({'detail': 'start_date must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
            if target_end_date and parsed_end is None:
                return Response({'detail': 'end_date must be in YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)

            target_year = create_next_academic_year(
                source_year,
                name=target_name,
                start_date=parsed_start,
                end_date=parsed_end,
            )

        if source_year.pk == target_year.pk:
            return Response(
                {'detail': 'Source year and target year must be different.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        options_payload = request.data.get('options') if isinstance(request.data.get('options'), dict) else {}
        options = YearRolloverOptions(
            migrate_subjects=self._to_bool(
                options_payload.get('migrate_subjects', options_payload.get('migrate_courses', True)),
                True,
            ),
            migrate_lessons=self._to_bool(
                options_payload.get('migrate_lessons', options_payload.get('migrate_chapters', True)),
                True,
            ),
            migrate_assessments=self._to_bool(
                options_payload.get(
                    'migrate_assessments',
                    options_payload.get('migrate_quizzes', options_payload.get('migrate_exercises', True)),
                ),
                True,
            ),
            migrate_timetable=self._to_bool(options_payload.get('migrate_timetable', True), True),
            auto_upgrade_students=self._to_bool(options_payload.get('auto_upgrade_students', False), False),
        )

        summary = rollover_academic_year(
            source_year=source_year,
            target_year=target_year,
            options=options,
        )

        return Response(
            {
                'source_year': source_year.name,
                'target_year': target_year.name,
                'summary': summary,
            }
        )

class AcademicClassViewSet(viewsets.ModelViewSet):
    # Prefetch related sections and subjects for performance
    queryset = AcademicClass.objects.prefetch_related('sections', 'subjects').all()
    serializer_class = AcademicClassSerializer
    permission_classes = [IsAuthenticated]

class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated]

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related('academic_class', 'teacher', 'teacher__user').prefetch_related(
        'additional_teachers',
        'additional_teachers__user',
    )
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Subject.objects.select_related('academic_class', 'teacher', 'teacher__user', 'academic_year').prefetch_related(
            'additional_teachers',
            'additional_teachers__user',
        )
        academic_year_param = self.request.query_params.get('academic_year')
        if academic_year_param:
            if str(academic_year_param).isdigit():
                queryset = queryset.filter(academic_year_id=academic_year_param)
            else:
                queryset = queryset.filter(academic_year__name=academic_year_param)
        else:
            current_year = ensure_current_academic_year()
            if current_year:
                queryset = queryset.filter(academic_year=current_year)
        return queryset

    def perform_create(self, serializer):
        academic_year = serializer.validated_data.get('academic_year') or ensure_current_academic_year()
        serializer.save(academic_year=academic_year)
