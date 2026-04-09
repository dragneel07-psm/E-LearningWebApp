# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Admin-only server-side action endpoints.

POST /api/academic/admin/actions/seed-attendance/
POST /api/academic/admin/actions/generate-ai-reports/

Both require an authenticated admin/staff session.  These exist so
demo/setup tasks can be triggered from the API without SSH access.
"""
import random
import uuid
from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdminOrStaff
from academic.models import Assessment, Attendance, Result, Student, Subject
from academic.services.academic_year_service import ensure_current_academic_year


def _school_days(end: date, count: int):
    days = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    return days


def _attendance_status() -> str:
    r = random.random()
    if r < 0.83:
        return 'present'
    if r < 0.95:
        return 'absent'
    return 'late'


class SeedAttendanceView(APIView):
    """
    POST /api/academic/admin/actions/seed-attendance/
    Body (optional): { "days": 30, "clear": false }
    """
    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        days_count = int(request.data.get('days', 30))
        do_clear = bool(request.data.get('clear', False))

        if days_count < 1 or days_count > 365:
            return Response({'detail': 'days must be between 1 and 365.'}, status=status.HTTP_400_BAD_REQUEST)

        current_year = ensure_current_academic_year()

        if do_clear:
            deleted, _ = Attendance.objects.all().delete()
        else:
            deleted = 0

        subjects = list(
            Subject.objects.filter(academic_year=current_year).select_related('academic_class')
            if current_year else
            Subject.objects.select_related('academic_class').all()
        )

        if not subjects:
            return Response({'detail': 'No subjects found. Seed subjects first.'}, status=status.HTTP_400_BAD_REQUEST)

        class_subjects: dict = {}
        for subj in subjects:
            class_subjects.setdefault(subj.academic_class_id, []).append(subj)

        students = list(Student.objects.select_related('academic_class').filter(
            academic_class_id__in=class_subjects.keys()
        ))

        if not students:
            return Response({'detail': 'No students found in classes with subjects.'}, status=status.HTTP_400_BAD_REQUEST)

        school_days = _school_days(date.today(), days_count)
        records = []
        seen: set = set()

        for student in students:
            subj_list = class_subjects.get(student.academic_class_id, [])
            for day in school_days:
                for subj in subj_list:
                    key = (student.pk, subj.pk, day)
                    if key not in seen:
                        seen.add(key)
                        records.append(Attendance(
                            student=student,
                            subject=subj,
                            date=day,
                            status=_attendance_status(),
                        ))

        created_count = 0
        batch_size = 500
        for i in range(0, len(records), batch_size):
            objs = Attendance.objects.bulk_create(records[i:i + batch_size], ignore_conflicts=True)
            created_count += len(objs)

        return Response({
            'status': 'ok',
            'deleted': deleted,
            'created': created_count,
            'students': len(students),
            'subjects': len(subjects),
            'days': days_count,
            'academic_year': current_year.name if current_year else None,
        })


class SeedResultsView(APIView):
    """
    POST /api/academic/admin/actions/seed-results/
    Body (optional): { "clear": false }
    Creates realistic Result records so grades appear on dashboards.
    Each student gets a result for every past assessment in their class.
    """
    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        do_clear = bool(request.data.get('clear', False))

        if do_clear:
            deleted, _ = Result.objects.all().delete()
        else:
            deleted = 0

        current_year = ensure_current_academic_year()
        now = timezone.now()

        assessments = list(
            Assessment.objects.select_related('subject', 'subject__academic_class')
            .filter(academic_year=current_year if current_year else Assessment.objects.none().__class__)
            .exclude(due_date__gt=now)  # only past/current assessments
            .exclude(due_date=None)
        ) if current_year else list(
            Assessment.objects.select_related('subject', 'subject__academic_class')
            .filter(due_date__lte=now)
            .exclude(due_date=None)
        )

        if not assessments:
            # Fallback: all assessments without future due_date
            assessments = list(
                Assessment.objects.select_related('subject', 'subject__academic_class')
                .filter(due_date__isnull=False)
            )

        if not assessments:
            return Response({'detail': 'No past assessments found to seed results for.'})

        class_to_assessments: dict = {}
        for a in assessments:
            class_to_assessments.setdefault(a.subject.academic_class_id, []).append(a)

        students = list(Student.objects.filter(academic_class_id__in=class_to_assessments.keys()))

        existing = set(
            Result.objects.filter(
                student__in=students
            ).values_list('assessment_id', 'student_id')
        )

        records = []
        for student in students:
            for assessment in class_to_assessments.get(student.academic_class_id, []):
                if (assessment.pk, student.pk) in existing:
                    continue
                total = assessment.total_marks
                # Normally-distributed score: mean 72%, std 15%
                raw = random.gauss(0.72, 0.15)
                score = max(0, min(total, round(raw * total)))
                records.append(Result(
                    student=student,
                    assessment=assessment,
                    score=score,
                    time_taken_minutes=random.randint(20, assessment.duration_minutes or 60),
                ))

        created_count = 0
        for i in range(0, len(records), 500):
            objs = Result.objects.bulk_create(records[i:i + 500], ignore_conflicts=True)
            created_count += len(objs)

        return Response({
            'status': 'ok',
            'deleted': deleted,
            'created': created_count,
            'students': len(students),
            'assessments': len(assessments),
        })


class GenerateAIReportsView(APIView):
    """
    POST /api/academic/admin/actions/generate-ai-reports/
    Triggers AI progress report generation for all students in the current year.
    """
    permission_classes = [IsAuthenticated, IsAdminOrStaff]

    def post(self, request):
        try:
            from ai_engine.tasks import generate_ai_reports_task
            result = generate_ai_reports_task()
            return Response({'status': 'ok', 'detail': str(result) if result else 'Reports generated.'})
        except Exception as e:
            # Fallback: call the management command logic directly
            try:
                from django.core.management import call_command
                from io import StringIO
                out = StringIO()
                call_command('generate_ai_reports', stdout=out, stderr=out)
                return Response({'status': 'ok', 'detail': out.getvalue()})
            except Exception as e2:
                return Response(
                    {'detail': f'Failed: {e2}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
