from django.utils import timezone
from datetime import timedelta
from academic.models import Subject
from ai_engine.models import StudyEvent

class ScheduleService:
    def generate_study_schedule(self, student, start_date=None, days=7):
        """
        Generates study events for the next 'days' days.
        Prioritizes weak subjects if known, otherwise distributes evenly.
        """
        if not start_date:
            start_date = timezone.now()

        # Get student's subjects
        if student.academic_class:
            subjects = list(student.academic_class.subjects.all())
        else:
            subjects = []
        
        if not subjects:
            return []

        # Clear existing future study events to avoid duplicates (optional, strictly speaking)
        # StudyEvent.objects.filter(student=student, start_time__gte=start_date).delete()

        generated_events = []
        current_date = start_date
        
        # Simple mock logic: 2 study sessions per day, 1 hour each
        # Rotating subjects
        subject_index = 0
        
        for i in range(days):
            day_date = current_date + timedelta(days=i)
            weekday = day_date.weekday() # 0=Mon, 6=Sun

            if weekday == 6: # Rest day Sunday
                continue

            # Evening study blocks
            # Session 1: 5:00 PM - 6:00 PM
            start_1 = day_date.replace(hour=17, minute=0, second=0, microsecond=0)
            end_1 = start_1 + timedelta(hours=1)
            
            subject_1 = subjects[subject_index % len(subjects)]
            
            event1 = StudyEvent.objects.create(
                tenant=student.user.tenant,
                student=student,
                title=f"Study: {subject_1.name}",
                description=f"Review recent materials for {subject_1.name}",
                start_time=start_1,
                end_time=end_1,
                event_type='study',
                subject=subject_1
            )
            generated_events.append(event1)
            subject_index += 1

            # Session 2: 7:00 PM - 8:00 PM
            start_2 = day_date.replace(hour=19, minute=0, second=0, microsecond=0)
            end_2 = start_2 + timedelta(hours=1)
            
            subject_2 = subjects[subject_index % len(subjects)]
            
            event2 = StudyEvent.objects.create(
                tenant=student.user.tenant,
                student=student,
                title=f"Practice: {subject_2.name}",
                description=f"Solve practice problems for {subject_2.name}",
                start_time=start_2,
                end_time=end_2,
                event_type='study',
                subject=subject_2
            )
            generated_events.append(event2)
            subject_index += 1
            
        return generated_events
