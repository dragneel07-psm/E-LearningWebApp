from django.db import models
import uuid as uuid_lib
from django.conf import settings
from .student import Student

class Parent(models.Model):
    parent_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='parent_profile')
    students = models.ManyToManyField(Student, related_name='parents')
    
    def __str__(self):
        return self.user.username
