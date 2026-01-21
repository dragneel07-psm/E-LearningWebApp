from django.db import models
from .class_section import AcademicClass
from .teacher import Teacher

class Timetable(models.Model):
    DAYS_OF_WEEK = [
        ('Monday', 'Monday'),
        ('Tuesday', 'Tuesday'),
        ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'),
        ('Friday', 'Friday'),
        ('Saturday', 'Saturday'),
        ('Sunday', 'Sunday'),
    ]

    timetable_id = models.AutoField(primary_key=True)
    academic_class = models.ForeignKey(AcademicClass, on_delete=models.CASCADE, related_name='timetable_entries')
    day_of_week = models.CharField(max_length=20, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    subject_name = models.CharField(max_length=100) # Simple string for now, could be linked to Course/Subject later
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True)
    room_number = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f"{self.academic_class} - {self.day_of_week} ({self.start_time} - {self.end_time})"
