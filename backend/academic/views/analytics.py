"""
School-wide analytics aggregation view.
Provides attendance trends, grade distributions, subject/class performance,
and assessment activity for the admin analytics dashboard.
"""
from datetime import date, timedelta

from django.db.models import Avg, Count, F, FloatField, Q, Sum
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import (
    AcademicClass, Attendance, Assessment, Result, Student, Subject, Teacher,
)


class SchoolAnalyticsDashboardView(APIView):
    """
    GET /api/academic/analytics/dashboard/
    Optional query params:
      days=30|60|90   - attendance window (default 30)
      class_id=<uuid> - filter by class
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(request.user, 'tenant', None)
        days = int(request.query_params.get('days', 30))
        class_id = request.query_params.get('class_id')

        since = date.today() - timedelta(days=days)

        # ── Attendance trends ────────────────────────────────────────────────
        att_qs = Attendance.objects.filter(date__gte=since)
        if tenant:
            att_qs = att_qs.filter(student__user__tenant=tenant)
        if class_id:
            att_qs = att_qs.filter(student__academic_class_id=class_id)

        daily_att = (
            att_qs
            .values('date')
            .annotate(
                present=Count('id', filter=Q(status='present')),
                absent=Count('id', filter=Q(status='absent')),
                late=Count('id', filter=Q(status='late')),
                total=Count('id'),
            )
            .order_by('date')
        )
        attendance_trend = [
            {
                'date': str(row['date']),
                'present': row['present'],
                'absent': row['absent'],
                'late': row['late'],
                'total': row['total'],
                'rate': round(row['present'] / row['total'] * 100, 1) if row['total'] else 0,
            }
            for row in daily_att
        ]

        # ── Overall attendance rate ──────────────────────────────────────────
        totals = att_qs.aggregate(
            present=Count('id', filter=Q(status='present')),
            total=Count('id'),
        )
        overall_attendance_rate = (
            round(totals['present'] / totals['total'] * 100, 1)
            if totals['total'] else 0
        )

        # ── Grade / score distribution ───────────────────────────────────────
        result_qs = Result.objects.filter(is_published=True)
        if tenant:
            result_qs = result_qs.filter(student__user__tenant=tenant)
        if class_id:
            result_qs = result_qs.filter(student__academic_class_id=class_id)

        buckets = {'A (90-100)': 0, 'B (75-89)': 0, 'C (60-74)': 0, 'D (40-59)': 0, 'F (<40)': 0}
        for r in result_qs.values('score', 'total_marks'):
            if r['total_marks'] and r['total_marks'] > 0:
                pct = (r['score'] / r['total_marks']) * 100
                if pct >= 90:
                    buckets['A (90-100)'] += 1
                elif pct >= 75:
                    buckets['B (75-89)'] += 1
                elif pct >= 60:
                    buckets['C (60-74)'] += 1
                elif pct >= 40:
                    buckets['D (40-59)'] += 1
                else:
                    buckets['F (<40)'] += 1

        grade_distribution = [{'grade': k, 'count': v} for k, v in buckets.items()]

        # ── Pass / fail rate ─────────────────────────────────────────────────
        total_results = result_qs.count()
        pass_count = sum(
            1 for r in result_qs.values('score', 'total_marks')
            if r['total_marks'] and (r['score'] / r['total_marks']) >= 0.4
        )
        pass_rate = round(pass_count / total_results * 100, 1) if total_results else 0

        # ── Subject performance (avg score %) ────────────────────────────────
        subject_perf_qs = (
            result_qs
            .filter(assessment__subject__isnull=False)
            .values(subject_name=F('assessment__subject__name'))
            .annotate(
                avg_score=Avg('score'),
                avg_total=Avg('total_marks'),
                result_count=Count('result_id'),
            )
            .order_by('-avg_score')[:10]
        )
        subject_performance = [
            {
                'subject': row['subject_name'],
                'avg_pct': round((row['avg_score'] / row['avg_total']) * 100, 1)
                if row['avg_total'] else 0,
                'count': row['result_count'],
            }
            for row in subject_perf_qs
        ]

        # ── Class performance (avg score %) ─────────────────────────────────
        class_perf_qs = (
            result_qs
            .filter(student__academic_class__isnull=False)
            .values(class_name=F('student__academic_class__name'))
            .annotate(
                avg_score=Avg('score'),
                avg_total=Avg('total_marks'),
                student_count=Count('student_id', distinct=True),
            )
            .order_by('-avg_score')[:10]
        )
        class_performance = [
            {
                'class': row['class_name'],
                'avg_pct': round((row['avg_score'] / row['avg_total']) * 100, 1)
                if row['avg_total'] else 0,
                'students': row['student_count'],
            }
            for row in class_perf_qs
        ]

        # ── Assessment activity (assessments published per month) ─────────────
        assess_qs = Assessment.objects.filter(is_published=True)
        if tenant:
            assess_qs = assess_qs.filter(
                Q(academic_class__isnull=True) | Q(academic_class__isnull=False)
            )
        monthly_assess = (
            assess_qs
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('assessment_id'))
            .order_by('month')
        )
        assessment_activity = [
            {
                'month': row['month'].strftime('%Y-%m'),
                'label': row['month'].strftime('%b %Y'),
                'count': row['count'],
            }
            for row in monthly_assess
        ]

        # ── Top performing students ──────────────────────────────────────────
        top_students_qs = (
            result_qs
            .values(student_id=F('student__student_id'), student_name=F('student__user__first_name'))
            .annotate(avg_score=Avg('score'), avg_total=Avg('total_marks'), result_count=Count('result_id'))
            .filter(result_count__gte=2)
            .order_by('-avg_score')[:5]
        )
        top_students = [
            {
                'student_id': str(row['student_id']),
                'name': row['student_name'] or 'Student',
                'avg_pct': round((row['avg_score'] / row['avg_total']) * 100, 1) if row['avg_total'] else 0,
                'assessments': row['result_count'],
            }
            for row in top_students_qs
        ]

        # ── School totals snapshot ───────────────────────────────────────────
        student_count = Student.objects.count()
        teacher_count = Teacher.objects.count()
        class_count = AcademicClass.objects.count()
        subject_count = Subject.objects.count()

        return Response({
            'snapshot': {
                'students': student_count,
                'teachers': teacher_count,
                'classes': class_count,
                'subjects': subject_count,
                'overall_attendance_rate': overall_attendance_rate,
                'pass_rate': pass_rate,
                'total_results': total_results,
            },
            'attendance_trend': attendance_trend,
            'grade_distribution': grade_distribution,
            'subject_performance': subject_performance,
            'class_performance': class_performance,
            'assessment_activity': assessment_activity,
            'top_students': top_students,
        })
