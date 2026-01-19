from django.db import models
from .academic_class import AcademicClass
from .student import Student

class Notice(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    ]

    AUDIENCE_CHOICES = [
        ('school', 'Whole School'),
        ('class', 'Specific Class'),
        ('student', 'Specific Student'),
    ]

    notice_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(max_length=50, default='General') # e.g., Academic, Event, Holiday
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='school')
    target_class = models.ForeignKey(AcademicClass, on_delete=models.CASCADE, null=True, blank=True, help_text="Required if audience is 'Specific Class'")
    target_student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, help_text="Required if audience is 'Specific Student'")
    
    published_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateField(null=True, blank=True)
    attachment = models.FileField(upload_to='notices/', null=True, blank=True, help_text="Upload PDF or Image")

    class Meta:
        ordering = ['-published_date']

    def __str__(self):
        return self.title
