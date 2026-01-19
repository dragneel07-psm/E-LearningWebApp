from django.db import models
import uuid as uuid_lib
from core.models.tenant import Tenant
from .student import Student

class Parent(models.Model):
    parent_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='parents')
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    students = models.ManyToManyField(Student, related_name='parents')

    def __str__(self):
        return self.full_name
