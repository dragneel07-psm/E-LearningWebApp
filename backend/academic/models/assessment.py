from django.db import models
import uuid as uuid_lib
from .course import Course
from .student import Student

class Assessment(models.Model):
    TYPES = [
        ('quiz', 'Quiz'),
        ('exam', 'Exam'),
        ('assignment', 'Assignment')
    ]
    
    BLOOMS_LEVELS = [
        ('remember', 'Remember'),
        ('understand', 'Understand'),
        ('apply', 'Apply'),
        ('analyze', 'Analyze'),
        ('evaluate', 'Evaluate'),
        ('create', 'Create')
    ]

    assessment_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assessments')
    title = models.CharField(max_length=255, default="Assessment")
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50, choices=TYPES, default='quiz')
    total_marks = models.IntegerField()
    passing_marks = models.IntegerField(default=40)
    
    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=60)
    
    # Analytics
    blooms_level = models.CharField(max_length=20, choices=BLOOMS_LEVELS, default='remember')
    
    def __str__(self):
        return self.title

class Result(models.Model):
    result_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='results')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='results')
    score = models.IntegerField()
    
    # Performance Stats
    time_taken_minutes = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    # Advanced Feedback
    ai_feedback = models.TextField(blank=True, null=True, help_text="AI generated feedback on performance")
    teacher_feedback = models.TextField(blank=True, null=True)
    
    # For descriptive answers analysis
    answers_data = models.JSONField(default=dict, blank=True) 
    
    class Meta:
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"{self.student} - {self.assessment}: {self.score}"
