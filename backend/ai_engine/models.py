from django.db import models
import uuid as uuid_lib
from django.conf import settings
from core.models.tenant import Tenant

class AIInteractionLog(models.Model):
    log_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    feature_used = models.CharField(max_length=100) # e.g., 'tutor', 'grading', 'email'
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    cost_estimated = models.DecimalField(max_digits=10, decimal_places=6, default=0.0)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tenant.name} - {self.feature_used}"
