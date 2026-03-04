from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Q
from academic.models.student import Student
from academic.models.assessment import Result
from academic.models.attendance import Attendance
from academic.models.class_section import Section
from core.reports import generate_pdf_response, generate_excel_response
from django.shortcuts import get_object_or_404


def _student_last_name_for_filename(student: Student) -> str:
    user = getattr(student, 'user', None)
    last_name = (getattr(user, 'last_name', '') or '').strip()
    if last_name:
        return last_name.replace(' ', '_')
    username = (getattr(user, 'username', '') or '').strip()
    if username:
        return username.replace(' ', '_')
    return 'student'


class ReportViewSet(viewsets.ViewSet):
    """
    ViewSet for generating various reports.
    """
    
    @action(detail=False, methods=['get'], url_path='student-performance/(?P<student_id>[^/.]+)')
    def student_performance_pdf(self, request, student_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        student = get_object_or_404(Student.objects.using(using_db).select_related('user'), id=student_id)
        
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

        avg_percentage = round(sum(item['percentage'] for item in results_data) / len(results_data), 1) if results_data else 0
        report_data = {
            'results_data': results_data,
            'metrics': {
                'total_assessments': len(results_data),
                'average_percentage': avg_percentage,
            },
            'ai_report': {
                'summary': 'Performance insights are generated from recent assessment attempts.',
                'strengths': [],
                'weaknesses': [],
                'recommendations': [],
            },
        }

        context = {
            'student': student,
            'report': report_data,
            'results_data': results_data, # Added this explicitly for the table loop
            'metrics': report_data.get('metrics', {}),
            'ai_report': report_data.get('ai_report', {}),
            'school_name': request.headers.get('x-tenant-id', 'Our School').capitalize(),
            'date': timezone.now().strftime("%B %d, %Y")
        }

        filename = f"performance_report_{_student_last_name_for_filename(student)}_{student_id[:8]}.pdf"
        response = generate_pdf_response('reports/student_performance.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='student-performance-excel/(?P<student_id>[^/.]+)')
    def student_performance_excel(self, request, student_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        student = get_object_or_404(Student.objects.using(using_db).select_related('user'), id=student_id)
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
        filename = f"performance_report_{_student_last_name_for_filename(student)}_{student_id[:8]}.xlsx"
        
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

    @action(detail=False, methods=['get'], url_path='result-card/(?P<student_id>[^/.]+)/(?P<result_id>[^/.]+)')
    def result_card_pdf(self, request, student_id=None, result_id=None):
        using_db = getattr(request, 'db_alias', 'default')
        student = get_object_or_404(Student.objects.using(using_db).select_related('section', 'section__academic_class', 'user'), id=student_id)
        result = get_object_or_404(
            Result.objects.using(using_db).select_related('assessment', 'assessment__subject'), 
            id=result_id, 
            student=student
        )
        
        context = {
            'student': student,
            'result': result,
            'assessment': result.assessment,
            'subject': result.assessment.subject,
            'percentage': round((result.score / result.assessment.total_marks) * 100, 1),
            'school_name': request.headers.get('x-tenant-id', 'Our School').split('.')[0].capitalize(),
            'date': timezone.now().strftime("%B %d, %Y")
        }

        filename = f"result_card_{_student_last_name_for_filename(student)}_{result.assessment.title.replace(' ', '_')}.pdf"
        response = generate_pdf_response('reports/result_card.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate result card"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='hall-ticket/(?P<seating_id>[^/.]+)')
    def hall_ticket_pdf(self, request, seating_id=None):
        """Generate individual hall ticket PDF for a student"""
        from academic.models.exam import ExamSeating
        
        using_db = getattr(request, 'db_alias', 'default')
        # Avoid cross-DB joins - fetch without select_related on user
        seating = get_object_or_404(
            ExamSeating.objects.using(using_db),
            seating_id=seating_id
        )
        
        # Access related objects individually (they'll use the router)
        context = {
            'hall_ticket_number': seating.hall_ticket_number,
            'student_name': f"{seating.student.user.first_name} {seating.student.user.last_name}",
            'student_id': str(seating.student.student_id)[:8],
            'class_section': f"{seating.student.section.academic_class.name} - {seating.student.section.name}",
            'seat_number': seating.seat_number,
            'exam_title': seating.exam.assessment.title,
            'subject_name': seating.exam.assessment.subject.name,
            'exam_date': seating.exam.created_at.strftime("%B %d, %Y") if seating.exam.created_at else "To Be Announced",
            'exam_center': seating.exam.exam_center or "Main Examination Hall",
            'room_number': seating.room_number,
            'school_name': request.headers.get('x-tenant-id', 'Our School').split('.')[0].capitalize(),
            'generation_date': timezone.now().strftime("%B %d, %Y at %I:%M %p")
        }
        
        filename = f"hall_ticket_{seating.hall_ticket_number}.pdf"
        response = generate_pdf_response('reports/hall_ticket.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate hall ticket"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='bulk-hall-tickets/(?P<exam_id>[^/.]+)')
    def bulk_hall_tickets_pdf(self, request, exam_id=None):
        """Generate hall tickets for all students in an exam (ZIP file)"""
        from academic.models.exam import Exam, ExamSeating
        import zipfile
        import io
        
        using_db = getattr(request, 'db_alias', 'default')
        exam = get_object_or_404(Exam.objects.using(using_db), exam_id=exam_id)
        # Avoid cross-DB joins
        seatings = ExamSeating.objects.using(using_db).filter(exam=exam)
        
        if not seatings.exists():
            return Response({"error": "No seating allocations found for this exam"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create ZIP file in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for seating in seatings:
                # Access related objects individually
                context = {
                    'hall_ticket_number': seating.hall_ticket_number,
                    'student_name': f"{seating.student.user.first_name} {seating.student.user.last_name}",
                    'student_id': str(seating.student.student_id)[:8],
                    'class_section': f"{seating.student.section.academic_class.name} - {seating.student.section.name}",
                    'seat_number': seating.seat_number,
                    'exam_title': exam.assessment.title,
                    'subject_name': exam.assessment.subject.name,
                    'exam_date': exam.created_at.strftime("%B %d, %Y") if exam.created_at else "To Be Announced",
                    'exam_center': exam.exam_center or "Main Examination Hall",
                    'room_number': seating.room_number,
                    'school_name': request.headers.get('x-tenant-id', 'Our School').split('.')[0].capitalize(),
                    'generation_date': timezone.now().strftime("%B %d, %Y at %I:%M %p")
                }
                
                # Generate PDF for this student
                from django.template.loader import render_to_string
                from xhtml2pdf import pisa
                html = render_to_string('reports/hall_ticket.html', context)
                pdf_buffer = io.BytesIO()
                pisa.pisaDocument(io.BytesIO(html.encode("UTF-8")), pdf_buffer)
                
                # Add to ZIP
                pdf_filename = f"{seating.hall_ticket_number}_{seating.student.user.last_name}.pdf"
                zip_file.writestr(pdf_filename, pdf_buffer.getvalue())
        
        # Return ZIP file
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="hall_tickets_{exam.assessment.title.replace(" ", "_")}.zip"'
        return response
