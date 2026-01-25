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
        student = get_object_or_404(Student, id=student_id)
        results = Result.objects.filter(student=student).select_related('assessment', 'assessment__subject')
        
        # Calculate percentages for display
        for r in results:
            r.percentage = round((r.score / r.assessment.total_marks) * 100, 1)
            
        context = {
            'student': student,
            'results': results,
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
        student = get_object_or_404(Student, id=student_id)
        results = Result.objects.filter(student=student).select_related('assessment', 'assessment__subject')
        
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
        section = get_object_or_404(Section, id=section_id)
        students = Student.objects.filter(class_section=section)
        
        # Aggregation logic
        data = []
        for student in students:
            stats = Attendance.objects.filter(student=student).aggregate(
                present=Count('attendance_id', filter=Q(status='present')),
                absent=Count('attendance_id', filter=Q(status='absent')),
                late=Count('attendance_id', filter=Q(status='late')),
                excused=Count('attendance_id', filter=Q(status='excused')),
                total=Count('attendance_id')
            )
            
            total = stats['total'] or 1
            percentage = round((stats['present'] / total) * 100, 1)
            
            data.append({
                'name': f"{student.first_name} {student.last_name}",
                'present': stats['present'],
                'absent': stats['absent'],
                'late': stats['late'],
                'excused': stats['excused'],
                'percentage': percentage
            })
            
        context = {
            'class_name': f"{section.class_name} - {section.section_name}",
            'attendance_data': data,
            'school_name': request.headers.get('x-tenant-id', 'Our School').capitalize(),
            'date': timezone.now().strftime("%B %d, %Y"),
            'start_date': "Initial Session",
            'end_date': timezone.now().strftime("%Y-%m-%d")
        }
        
        filename = f"attendance_summary_{section.section_name}.pdf"
        response = generate_pdf_response('reports/attendance_summary.html', context, filename)
        
        if response:
            return response
        return Response({"error": "Failed to generate report"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='attendance-summary-excel/(?P<section_id>[^/.]+)')
    def attendance_summary_excel(self, request, section_id=None):
        section = get_object_or_404(Section, id=section_id)
        students = Student.objects.filter(class_section=section)
        
        rows = []
        for student in students:
            stats = Attendance.objects.filter(student=student).aggregate(
                present=Count('attendance_id', filter=Q(status='present')),
                absent=Count('attendance_id', filter=Q(status='absent')),
                late=Count('attendance_id', filter=Q(status='late')),
                excused=Count('attendance_id', filter=Q(status='excused')),
                total=Count('attendance_id')
            )
            
            total = stats['total'] or 1
            rows.append({
                'Student Name': f"{student.first_name} {student.last_name}",
                'Present': stats['present'],
                'Absent': stats['absent'],
                'Late': stats['late'],
                'Excused': stats['excused'],
                'Attendance %': round((stats['present'] / total) * 100, 2)
            })
            
        columns = ['Student Name', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %']
        filename = f"attendance_summary_{section.section_name}.xlsx"
        
        return generate_excel_response(rows, columns, filename)
