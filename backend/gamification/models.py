from django.db import models
from django.conf import settings
import uuid
from core.models.tenant import Tenant

class Badge(models.Model):
    CRITERIA_CHOICES = [
        ('lessons_completed', 'Lessons Completed'),
        ('assessments_passed', 'Assessments Passed'),
        ('streak_days', 'Streak Days'),
        ('perfect_score', 'Perfect Score on Assessment'),
        ('early_bird', 'Early Submission'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon_name = models.CharField(max_length=50, default='award') # Lucide icon name
    criteria_type = models.CharField(max_length=50, choices=CRITERIA_CHOICES)
    criteria_value = models.IntegerField(default=1)
    
    xp_reward = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.criteria_type})"

class StudentBadge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'badge')

    def __str__(self):
        return f"{self.student} - {self.badge.name}"

class PointTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, db_constraint=False)
    student = models.ForeignKey('academic.Student', on_delete=models.CASCADE, related_name='points')
    points = models.IntegerField()
    description = models.CharField(max_length=255)
    activity_type = models.CharField(max_length=50) # 'lesson', 'quiz', 'badge', 'streak'
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student}: {self.points} for {self.description}"
