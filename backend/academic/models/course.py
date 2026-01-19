from django.db import models
import uuid as uuid_lib
from .academic_class import AcademicClass

class Course(models.Model):
    course_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    academic_class = models.ForeignKey(AcademicClass, on_delete=models.CASCADE, related_name='courses')
    teacher = models.ForeignKey('academic.Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='courses_taught')
    subject = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.subject} ({self.academic_class})"

class Lesson(models.Model):
    lesson_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255, default="New Lesson")
    content_type = models.CharField(max_length=50)
    content = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.title
