from django.db import models
import uuid as uuid_lib
from django_tenants.models import TenantMixin, DomainMixin
from .base import TimeStampedModel

class Tenant(TenantMixin, TimeStampedModel):
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    TYPE_CHOICES = (
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='standard')
    status = models.CharField(max_length=20, default='active')
    
    # Profile & Settings
    address = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    current_academic_year = models.CharField(max_length=20, default='2024-2025')
    established_year = models.IntegerField(blank=True, null=True)
    logo = models.ImageField(upload_to='tenant_logos/', blank=True, null=True)
    
    # Feature Flags for SaaS Admin to control tenant capabilities
    features = models.JSONField(
        default=dict,
        blank=True,
        help_text="Stores active/inactive features for different roles, e.g., {'parents': {'view_attendance': True}}"
    )

    # default true, schema will be automatically created and synced when it is saved
    auto_create_schema = True
    
    def __str__(self):
        return self.name

class Domain(DomainMixin):
    pass
