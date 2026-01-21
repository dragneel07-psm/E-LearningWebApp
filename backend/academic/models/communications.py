from django.db import models
from django.conf import settings
from core.models import Tenant

class Notice(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='notices', null=True)
    AUDIENCE_CHOICES = [
        ('student', 'Specific Student'),
        ('class', 'Specific Class'),
        ('school', 'Whole School'),
    ]
    title = models.CharField(max_length=200, help_text="Title of the notice")
    content = models.TextField()
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='school')
    
    target_student = models.ForeignKey('Student', on_delete=models.CASCADE, null=True, blank=True)
    target_class = models.ForeignKey('AcademicClass', on_delete=models.CASCADE, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
