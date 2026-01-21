from django.core.management.base import BaseCommand
from academic.models import Student
from ai_engine.services.reporting_service import ReportingService
import json

class Command(BaseCommand):
    help = 'Generates AI Progress Reports for all students and logs them'

    def add_arguments(self, parser):
        parser.add_argument('--student', type=str, help='Generate for a specific student ID')

    def handle(self, *args, **options):
        service = ReportingService()
        
        if options['student']:
            students = Student.objects.filter(student_id=options['student'])
        else:
            students = Student.objects.all()

        self.stdout.write(self.style.SUCCESS(f'Starting AI report generation for {students.count()} students...'))

        for student in students:
            try:
                report = service.generate_student_report(student.student_id, is_automated=True)
                self.stdout.write(f'Generated report for {student.user.get_full_name()}')
                
                # In a real system, you might save this to a model like 'StudentReport'
                # or send it via email/notification.
                # For now, we just log the success.
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed for {student.student_id}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS('Report generation sweep completed.'))
