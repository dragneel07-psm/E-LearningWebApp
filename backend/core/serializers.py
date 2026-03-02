# core/serializers.py
from rest_framework import serializers
from .models import Tenant, AuditLog, GlobalSettings
import re

class TenantSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    billing_cycle = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()
    ai_usage = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'schema_name', 'name', 'subdomain', 'type', 'status', 
            'contact_email', 'contact_phone', 'address', 'website',
            'plan_name', 'subscription_status', 'billing_cycle',
            'student_count', 'teacher_count', 'ai_usage', 'logo'
        ]
    
    def get_plan_name(self, obj):
        try:
            return obj.subscription.plan.name if obj.subscription and obj.subscription.plan else "No Plan"
        except:
            return "No Plan"

    def get_subscription_status(self, obj):
        try:
            sub = getattr(obj, 'subscription', None)
            return sub.status if sub else "Inactive"
        except:
            return "Inactive"

    def get_billing_cycle(self, obj):
        try:
            sub = getattr(obj, 'subscription', None)
            return sub.billing_cycle if sub else "N/A"
        except:
            return "N/A"

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
        from .models import Tenant
        if Tenant.objects.filter(schema_name=value).exists():
            raise serializers.ValidationError("Subdomain (schema) already taken.")
        if not re.match(r'^[a-z0-9-]+$', value):
            raise serializers.ValidationError("Subdomain must be lowercase alphanumeric with hyphens.")
        return value

    def create(self, validated_data):
        # schema_name is derived from subdomain in the view's perform_create,
        # but the serializer still needs to pop the write-only fields.
        validated_data.pop('admin_email', None)
        validated_data.pop('admin_first_name', None)
        validated_data.pop('admin_last_name', None)
        validated_data.pop('password', None)
        
        # subdomain is a real field on our model now
        return Tenant.objects.create(**validated_data)
