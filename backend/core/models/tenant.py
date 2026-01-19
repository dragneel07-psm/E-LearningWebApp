from django.db import models
import uuid as uuid_lib
from .base import TimeStampedModel

class Tenant(TimeStampedModel):
    tenant_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=255, unique=True)
    domain = models.CharField(max_length=255, blank=True, null=True, unique=True)
    
    TYPE_CHOICES = (
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='standard')
    status = models.CharField(max_length=20, default='active')
    
    # Database Configuration (For Database-per-Tenant)
    db_name = models.CharField(max_length=100, unique=True, default='tenant_default.sqlite3', help_text="Name of the database file or schema")
    db_alias = models.CharField(max_length=100, unique=True, default='default_alias', help_text="Django DB alias (e.g. 'default', 'tenant_1')")
    domain_url = models.CharField(max_length=255, unique=True, default='localhost', help_text="Full domain (e.g. school.saas.com)")
    
    # Profile & Settings
    address = models.TextField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    current_academic_year = models.CharField(max_length=20, default='2024-2025')
    established_year = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return self.name
