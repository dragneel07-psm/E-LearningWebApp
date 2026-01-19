# core/serializers.py
from rest_framework import serializers
from .models import Tenant, AuditLog, GlobalSettings

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
        return obj.useraccount_set.filter(role='student').count()

    def get_teacher_count(self, obj):
        return obj.useraccount_set.filter(role='teacher').count()
    
    def get_ai_usage(self, obj):
        # Placeholder for AI usage calculation
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
