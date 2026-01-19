from django.db import models
import uuid as uuid_lib
from core.models.tenant import Tenant

class AcademicClass(models.Model):
    class_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='classes', db_constraint=False)
    grade = models.IntegerField()
    section = models.CharField(max_length=10)

    def __str__(self):
        return f"Grade {self.grade}-{self.section}"
