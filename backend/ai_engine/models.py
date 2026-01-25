from django.db import models
import uuid as uuid_lib
from django.conf import settings
from core.models.tenant import Tenant

class AIInteractionLog(models.Model):
    log_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    feature_used = models.CharField(max_length=100) # e.g., 'tutor', 'grading', 'email'
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    cost_estimated = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tenant.name} - {self.feature_used}"

class StudentAIReport(models.Model):
    report_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='ai_reports')
    report_data = models.JSONField()
    generated_at = models.DateTimeField(auto_now_add=True)
    is_automated = models.BooleanField(default=False)

    def __str__(self):
        return f"Report for {self.student} - {self.generated_at.date()}"

class LearningPath(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='learning_paths')
    subject = models.ForeignKey('academic.Subject', on_delete=models.CASCADE, related_name='learning_paths', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    generated_by_ai = models.BooleanField(default=True)

    def __str__(self):
        return f"Path: {self.title} ({self.student})"

class LearningNode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    learning_path = models.ForeignKey(LearningPath, on_delete=models.CASCADE, related_name='nodes')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    order = models.IntegerField(default=0)
    resource_type = models.CharField(max_length=50, choices=[
        ('video', 'Video'),
        ('article', 'Article'),
        ('quiz', 'Quiz'),
        ('assignment', 'Assignment'),
        ('topic', 'Topic Concept')
    ], default='topic')
    resource_link = models.CharField(max_length=500, null=True, blank=True) # Could be internal URL or external
    estimated_minutes = models.IntegerField(default=15)
    status = models.CharField(max_length=20, choices=[
        ('locked', 'Locked'),
        ('unlocked', 'Unlocked'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed')
    ], default='locked')
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.order}. {self.title}"

class StudyEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='study_events')
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    event_type = models.CharField(max_length=50, choices=[
        ('class', 'Class Session'),
        ('study', 'Self Study'),
        ('assignment', 'Assignment due'),
        ('exam', 'Exam Prep'),
        ('break', 'Break')
    ], default='study')
    subject = models.ForeignKey('academic.Subject', on_delete=models.SET_NULL, null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.start_time})"
