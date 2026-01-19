from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class UserAccount(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('parent', 'Parent'),
        ('admin', 'Admin'),
        ('saas_admin', 'SaaS Admin'),
    )
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Circular import risk if we import Tenant directly? 
    # Use string reference 'core.Tenant'.
    tenant = models.ForeignKey('core.Tenant', on_delete=models.CASCADE, null=True, blank=True, db_constraint=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    
    # Extended Profile Fields
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    # Use email as the login field
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
