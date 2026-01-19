from django.db import models
import uuid as uuid_lib
from django.conf import settings
from .academic_class import AcademicClass

class Student(models.Model):
    student_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_profile', db_constraint=False)
    academic_class = models.ForeignKey(AcademicClass, on_delete=models.SET_NULL, null=True, related_name='students')

    # Personalization & Learning Preferences
    LEARNING_STYLES = [
        ('visual', 'Visual (Video)'),
        ('reading', 'Reading (Text)'),
        ('practice', 'Practice (Quiz)')
    ]
    
    EXPLANATION_LEVELS = [
        ('simple', 'Simple'),
        ('normal', 'Normal'),
        ('exam', 'Exam-Oriented')
    ]

    learning_style = models.CharField(max_length=20, choices=LEARNING_STYLES, default='visual')
    daily_study_goal = models.IntegerField(default=30, help_text="Daily study goal in minutes")
    ai_explanation_level = models.CharField(max_length=20, choices=EXPLANATION_LEVELS, default='normal')
    language_preference = models.CharField(max_length=10, default='en')
    
    # Gamification & Stats
    current_streak = models.IntegerField(default=0)
    total_minutes_learned = models.IntegerField(default=0)
    focus_score = models.IntegerField(default=85, help_text="AI-calculated focus score 0-100")

    def __str__(self):
        return f"Student: {self.user.username}"
