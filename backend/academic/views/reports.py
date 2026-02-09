from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from academic.models.student import Student
from academic.models.assessment import Result
from academic.models.attendance import Attendance
from academic.models.class_section import Section
from core.reports import generate_pdf_response, generate_excel_response
from django.shortcuts import get_object_or_404

class ReportViewSet(viewsets.ViewSet):
    """
    ViewSet for generating various reports.
    """
    
    @action(detail=False, methods=['get'], url_path='student-performance/(?P<student_id>[^/.]+)')
    def student_performance_pdf(self, request, student_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        student = get_object_or_404(Student.objects.using(using_db), id=student_id)
        
        # Use ReportingService to get comprehensive data including AI summary
        # Transform results for template since we are using service now
        results_data = []
        # We can re-fetch or use what service collected if it returns raw objects?
        # Service returns 'mastery' but maybe not raw list. Let's re-fetch for the table to be safe and detailed.
        results = Result.objects.using(using_db).filter(student=student).select_related('assessment', 'assessment__subject').order_by('-submitted_at')
        for r in results:
            results_data.append({
                'subject': r.assessment.subject.name,
                'assessment': r.assessment.title,
                'type': r.assessment.get_type_display(),
                'score': r.score,
                'total_marks': r.assessment.total_marks,
                'percentage': round((r.score / r.assessment.total_marks) * 100, 1),
                'submitted_at': r.submitted_at
            })

        context = {
            'student': student,
            'report': report_data,
            'results_data': results_data, # Added this explicitly for the table loop
            'metrics': report_data.get('metrics', {}),
            'ai_report': report_data.get('ai_report', {}),
            'school_name': request.headers.get('x-tenant-id', 'Our School').capitalize(),
            'date': timezone.now().strftime("%B %d, %Y")
        }
        
        filename = f"performance_report_{student.last_name}_{student_id[:8]}.pdf"
        response = generate_pdf_response('reports/student_performance.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='student-performance-excel/(?P<student_id>[^/.]+)')
    def student_performance_excel(self, request, student_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        student = get_object_or_404(Student.objects.using(using_db), id=student_id)
        results = Result.objects.using(using_db).filter(student=student).select_related('assessment', 'assessment__subject')
        
        data = []
        for r in results:
            data.append({
                'Subject': r.assessment.subject.name,
                'Assessment': r.assessment.title,
                'Type': r.assessment.get_type_display(),
                'Score': r.score,
                'Total Marks': r.assessment.total_marks,
                'Percentage': round((r.score / r.assessment.total_marks) * 100, 2),
                'Date': r.submitted_at.strftime("%Y-%m-%d")
            })
            
        columns = ['Subject', 'Assessment', 'Type', 'Score', 'Total Marks', 'Percentage', 'Date']
        filename = f"performance_report_{student.last_name}_{student_id[:8]}.xlsx"
        
        return generate_excel_response(data, columns, filename)

    @action(detail=False, methods=['get'], url_path='attendance-summary/(?P<section_id>[^/.]+)')
    def attendance_summary_pdf(self, request, section_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        section = get_object_or_404(Section.objects.using(using_db).select_related('academic_class'), id=section_id)
        students = Student.objects.using(using_db).filter(section=section).select_related('user')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date') or timezone.now().strftime("%Y-%m-%d")
        
        from django.core.cache import cache
        cache_key = f"attendance_summary_data_{section_id}_{start_date}_{end_date}_{using_db}"
        data = cache.get(cache_key)
        
        if not data:
            # Optimize: Single query with filtered aggregations for all students in the section
            attendance_stats = Student.objects.using(using_db).filter(section=section).select_related('user').annotate(
                present_count=Count('attendance_records', filter=Q(attendance_records__status='present', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                absent_count=Count('attendance_records', filter=Q(attendance_records__status='absent', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                late_count=Count('attendance_records', filter=Q(attendance_records__status='late', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                excused_count=Count('attendance_records', filter=Q(attendance_records__status='excused', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                total_records=Count('attendance_records', filter=Q(**(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {})))
            )

            data = []
            for student_stat in attendance_stats:
                total = student_stat.total_records or 1
                percentage = round((student_stat.present_count / total) * 100, 1)
                
                data.append({
                    'name': f"{student_stat.user.first_name} {student_stat.user.last_name}",
                    'present': student_stat.present_count,
                    'absent': student_stat.absent_count,
                    'late': student_stat.late_count,
                    'excused': student_stat.excused_count,
                    'percentage': percentage
                })
            cache.set(cache_key, data, 600) # Cache for 10 minutes
            
        context = {
            'class_name': f"{section.academic_class.name} - {section.name}",
            'attendance_data': data,
            'school_name': request.headers.get('x-tenant-id', 'Our School').capitalize(),
            'date': timezone.now().strftime("%B %d, %Y"),
            'start_date': start_date or "Initial Session",
            'end_date': end_date
        }
        
        filename = f"attendance_summary_{section.name}.pdf"
        response = generate_pdf_response('reports/attendance_summary.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='attendance-summary-excel/(?P<section_id>[^/.]+)')
    def attendance_summary_excel(self, request, section_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        section = get_object_or_404(Section.objects.using(using_db).select_related('academic_class'), id=section_id)
        students = Student.objects.using(using_db).filter(section=section).select_related('user')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date') or timezone.now().strftime("%Y-%m-%d")
        
        from django.core.cache import cache
        cache_key = f"attendance_summary_data_{section_id}_{start_date}_{end_date}_{using_db}"
        rows = cache.get(cache_key)
        
        if not rows:
            # Optimize: Reuse the same efficient aggregation logic or shared cache
            attendance_stats = Student.objects.using(using_db).filter(section=section).select_related('user').annotate(
                present_count=Count('attendance_records', filter=Q(attendance_records__status='present', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                absent_count=Count('attendance_records', filter=Q(attendance_records__status='absent', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                late_count=Count('attendance_records', filter=Q(attendance_records__status='late', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                excused_count=Count('attendance_records', filter=Q(attendance_records__status='excused', **(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {}))),
                total_records=Count('attendance_records', filter=Q(**(
                    {'attendance_records__date__gte': start_date} if start_date else {}), **(
                    {'attendance_records__date__lte': end_date} if end_date else {})))
            )

            rows = []
            for student_stat in attendance_stats:
                total = student_stat.total_records or 1
                rows.append({
                    'Student Name': f"{student_stat.user.first_name} {student_stat.user.last_name}",
                    'Present': student_stat.present_count,
                    'Absent': student_stat.absent_count,
                    'Late': student_stat.late_count,
                    'Excused': student_stat.excused_count,
                    'Attendance %': round((student_stat.present_count / total) * 100, 2)
                })
            cache.set(cache_key, rows, 600) # Reuse data from PDF or cache if not exists
            
        columns = ['Student Name', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %']
        filename = f"attendance_summary_{section.name}.xlsx"
        
        return generate_excel_response(rows, columns, filename)
