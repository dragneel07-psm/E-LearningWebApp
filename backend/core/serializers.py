# core/serializers.py
from rest_framework import serializers
from .models import Tenant, AuditLog, GlobalSettings
import re

class TenantSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='subscription.plan.name', read_only=True, default="No Plan")
    subscription_status = serializers.CharField(source='subscription.status', read_only=True, default="Inactive")
    billing_cycle = serializers.CharField(source='subscription.billing_cycle', read_only=True, default="N/A")
    student_count = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()
    ai_usage = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = '__all__'
        extra_kwargs = {
            'db_name': {'required': False, 'allow_null': True},
            'db_alias': {'required': False, 'allow_null': True},
            'domain_url': {'required': False, 'allow_null': True},
        }
    
    def get_student_count(self, obj):
        # This count via related set might fail if UserAccount is not on 'default' DB 
        # but Tenant is on 'default'. 
        # Correct way involves cross-db query or routers allowing relation. 
        # For now, simplistic approach or specific logic needed.
        return 0 # Placeholder to avoid router errors early on

    def get_teacher_count(self, obj):
        return 0
    
    def get_ai_usage(self, obj):
        return "0%"

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField() # Display username
    
    class Meta:
        model = AuditLog
        fields = '__all__'

class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = '__all__'

class TenantCreateSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(write_only=True)
    admin_first_name = serializers.CharField(write_only=True)
    admin_last_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, required=False) # Optional, can auto-gen

    class Meta:
        model = Tenant
        fields = ['name', 'subdomain', 'contact_email', 'address', 'admin_email', 'admin_first_name', 'admin_last_name', 'password']
        extra_kwargs = {
            'contact_email': {'required': False}
        }

    def validate_subdomain(self, value):
        if Tenant.objects.filter(subdomain=value).exists():
            raise serializers.ValidationError("Subdomain already taken.")
        if not re.match(r'^[a-z0-9-]+$', value):
            raise serializers.ValidationError("Subdomain must be lowercase alphanumeric with hyphens.")
        return value

    def create(self, validated_data):
        # Remove non-model fields before creating Tenant instance
        validated_data.pop('admin_email', None)
        validated_data.pop('admin_first_name', None)
        validated_data.pop('admin_last_name', None)
        validated_data.pop('password', None)
        return Tenant.objects.create(**validated_data)
