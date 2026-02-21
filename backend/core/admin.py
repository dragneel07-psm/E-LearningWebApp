from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Tenant

@admin.register(Tenant)
class TenantAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'schema_name', 'type', 'status', 'created_at')
    list_filter = ('type', 'status')
    search_fields = ('name', 'schema_name')
