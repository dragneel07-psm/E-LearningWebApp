# core/serializers.py
from rest_framework import serializers
from .models import Tenant, AuditLog, GlobalSettings
import re
from django.db import connection
from django.db.models import Sum

class TenantSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()
    billing_cycle = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()
    total_users = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    ai_usage = serializers.SerializerMethodField()
    ai_tokens_used = serializers.SerializerMethodField()
    ai_token_limit = serializers.SerializerMethodField()
    storage_used_bytes = serializers.SerializerMethodField()
    storage_used_mb = serializers.SerializerMethodField()
    storage_limit_gb = serializers.SerializerMethodField()
    storage_usage_percent = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'schema_name', 'name', 'subdomain', 'type', 'status', 
            'contact_email', 'contact_phone', 'address', 'website',
            'plan_name', 'subscription_status', 'billing_cycle',
            'student_count', 'teacher_count', 'total_users', 'admin_count',
            'ai_usage', 'ai_tokens_used', 'ai_token_limit',
            'storage_used_bytes', 'storage_used_mb', 'storage_limit_gb', 'storage_usage_percent',
            'logo'
        ]
    
    def get_plan_name(self, obj):
        try:
            return obj.subscription.plan.name if obj.subscription and obj.subscription.plan else "No Plan"
        except:
            return "No Plan"

    def get_subscription_status(self, obj):
        try:
            sub = getattr(obj, 'subscription', None)
            if sub:
                return sub.get_status_display() if hasattr(sub, 'get_status_display') else sub.status
            # If no subscription record, use the Tenant's own status or default to Active
            return obj.status.capitalize() if hasattr(obj, 'status') else "Active"
        except:
            return "Active"

    def get_billing_cycle(self, obj):
        try:
            sub = getattr(obj, 'subscription', None)
            if sub:
                return sub.get_billing_cycle_display() if hasattr(sub, 'get_billing_cycle_display') else sub.billing_cycle
            return "Trial"
        except:
            return "Trial"

    def _get_stats(self, obj):
        if not hasattr(self, '_stats_cache'):
            self._stats_cache = {}
        cache_key = str(obj.id)
        if cache_key in self._stats_cache:
            return self._stats_cache[cache_key]

        stats = {
            'student_count': 0,
            'teacher_count': 0,
            'total_users': 0,
            'admin_count': 0,
            'ai_tokens_used': 0,
            'storage_used_bytes': 0,
        }

        try:
            from django_tenants.utils import schema_context
            with schema_context(obj.schema_name):
                from academic.models import Student, Teacher
                from users.models import UserAccount
                from ai_engine.models import AIInteractionLog

                stats['student_count'] = Student.objects.count()
                stats['teacher_count'] = Teacher.objects.count()
                stats['total_users'] = UserAccount.objects.exclude(role='saas_admin').count()
                stats['admin_count'] = UserAccount.objects.filter(role='admin').count()
                stats['ai_tokens_used'] = AIInteractionLog.objects.aggregate(total=Sum('total_tokens'))['total'] or 0
        except Exception:
            # Keep graceful fallbacks
            pass

        try:
            # Compute real DB footprint per tenant schema (tables + indexes + TOAST)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0)
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = %s
                      AND c.relkind IN ('r', 'm', 'i', 't')
                    """,
                    [obj.schema_name]
                )
                row = cursor.fetchone()
                stats['storage_used_bytes'] = int(row[0] or 0) if row else 0
        except Exception:
            stats['storage_used_bytes'] = 0

        self._stats_cache[cache_key] = stats
        return stats

    def _get_ai_limit(self, obj):
        try:
            sub = getattr(obj, 'subscription', None)
            return int(sub.ai_token_limit) if sub and sub.ai_token_limit is not None else 0
        except Exception:
            return 0

    def _get_storage_limit_gb(self, obj):
        try:
            sub = getattr(obj, 'subscription', None)
            return int(sub.storage_limit_gb) if sub and sub.storage_limit_gb is not None else 0
        except Exception:
            return 0

    def get_student_count(self, obj):
        return self._get_stats(obj)['student_count']

    def get_teacher_count(self, obj):
        return self._get_stats(obj)['teacher_count']

    def get_total_users(self, obj):
        return self._get_stats(obj)['total_users']

    def get_admin_count(self, obj):
        return self._get_stats(obj)['admin_count']
    
    def get_ai_usage(self, obj):
        used = self.get_ai_tokens_used(obj)
        limit = self.get_ai_token_limit(obj)
        if limit <= 0:
            return "0%"
        return f"{round((used / limit) * 100, 1)}%"

    def get_ai_tokens_used(self, obj):
        return self._get_stats(obj)['ai_tokens_used']

    def get_ai_token_limit(self, obj):
        return self._get_ai_limit(obj)

    def get_storage_used_bytes(self, obj):
        return self._get_stats(obj)['storage_used_bytes']

    def get_storage_used_mb(self, obj):
        return round(self.get_storage_used_bytes(obj) / (1024 * 1024), 2)

    def get_storage_limit_gb(self, obj):
        return self._get_storage_limit_gb(obj)

    def get_storage_usage_percent(self, obj):
        limit_gb = self.get_storage_limit_gb(obj)
        if limit_gb <= 0:
            return 0.0
        limit_bytes = limit_gb * 1024 * 1024 * 1024
        return round((self.get_storage_used_bytes(obj) / limit_bytes) * 100, 2)

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField() # Display username
    
    class Meta:
        model = AuditLog
        fields = '__all__'

class GlobalSettingsSerializer(serializers.ModelSerializer):
    ai_provider_name = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    ai_base_url = serializers.URLField(required=False, allow_blank=True)
    ai_model = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    auto_detect_model = serializers.BooleanField(write_only=True, required=False, default=True)
    ai_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=True)
    ai_api_key_masked = serializers.SerializerMethodField(read_only=True)
    ai_api_key_configured = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = GlobalSettings
        fields = [
            'id',
            'site_name',
            'maintenance_mode',
            'allow_registration',
            'support_email',
            'default_language',
            'ai_enabled',
            'ai_provider_name',
            'ai_base_url',
            'ai_model',
            'auto_detect_model',
            'ai_api_key',
            'ai_api_key_masked',
            'ai_api_key_configured',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at', 'ai_api_key_masked', 'ai_api_key_configured']

    def get_ai_api_key_masked(self, obj):
        key = (obj.ai_api_key or '').strip()
        if not key:
            return ''
        if len(key) <= 8:
            return '*' * len(key)
        return f"{key[:4]}...{key[-4:]}"

    def get_ai_api_key_configured(self, obj):
        return bool((obj.ai_api_key or '').strip())

    def validate_ai_base_url(self, value):
        cleaned_value = (value or '').strip()
        if not cleaned_value:
            return 'https://api.openai.com/v1'
        return cleaned_value.rstrip('/')

    def validate(self, attrs):
        provider_name = attrs.get('ai_provider_name')
        model_name = attrs.get('ai_model')

        if provider_name is not None and not str(provider_name).strip():
            attrs['ai_provider_name'] = 'OpenAI'

        if model_name is not None and not str(model_name).strip():
            attrs['ai_model'] = 'gpt-3.5-turbo'

        return attrs

    def update(self, instance, validated_data):
        auto_detect_model = bool(validated_data.pop('auto_detect_model', True))
        incoming_key = validated_data.pop('ai_api_key', None)
        base_url_changed = 'ai_base_url' in validated_data

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        key_updated = False
        # Preserve existing key when empty/blank payload is sent.
        if incoming_key is not None:
            cleaned_key = incoming_key.strip()
            if cleaned_key:
                instance.ai_api_key = cleaned_key
                key_updated = True

        # Auto-detect provider/model when a new key is set or base_url changes with existing key.
        if auto_detect_model and instance.ai_api_key and (key_updated or base_url_changed):
            try:
                from ai_engine.services.model_discovery import detect_provider_and_model

                detected = detect_provider_and_model(
                    api_key=instance.ai_api_key,
                    base_url=instance.ai_base_url,
                )

                detected_provider = (detected.get('provider_name') or '').strip()
                detected_base_url = (detected.get('base_url') or '').strip().rstrip('/')
                detected_model = (detected.get('model') or '').strip()

                if detected_provider:
                    instance.ai_provider_name = detected_provider
                if detected_base_url:
                    instance.ai_base_url = detected_base_url
                if detected_model:
                    instance.ai_model = detected_model
            except Exception:
                # Never fail settings save because model discovery failed.
                pass

        instance.save()
        return instance

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
