# users/serializers.py
from rest_framework import serializers
from .models import UserAccount
from core.utils.plan_enforcement import build_plan_entitled_features, get_tenant_plan
from core.utils.audit import record_audit_event

def _safe_tenant_features(user) -> dict:
    try:
        tenant = getattr(user, "tenant", None)
    except Exception:
        tenant = None

    if not tenant:
        return {}

    try:
        return build_plan_entitled_features(get_tenant_plan(tenant))
    except Exception:
        return build_plan_entitled_features(None)


def _tenant_claims(user) -> dict:
    tenant = getattr(user, "tenant", None)
    if not tenant:
        return {
            "tenant_schema": "public",
            "tenant_id": None,
        }
    return {
        "tenant_schema": getattr(tenant, "schema_name", "public"),
        "tenant_id": str(getattr(tenant, "id", "")) or None,
    }

class UserAccountSerializer(serializers.ModelSerializer):
    tenant_features = serializers.SerializerMethodField()

    class Meta:
        model = UserAccount
        fields = ['user_id', 'username', 'email', 'first_name', 'last_name', 'role', 'tenant', 'is_active', 'tenant_features']
        read_only_fields = ['user_id', 'email', 'role', 'tenant', 'tenant_features']

    def get_tenant_features(self, obj):
        return _safe_tenant_features(obj)

from django.contrib.auth.models import Group, Permission

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = '__all__'

class GroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        write_only=True, 
        queryset=Permission.objects.all(), 
        source='permissions',
        required=False
    )
    
    class Meta:
        model = Group
        fields = '__all__'

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken as _RefreshToken

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    # Tell SimpleJWT to use 'email' as the login field
    # (matches UserAccount.USERNAME_FIELD = 'email')
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed useful claims so the frontend can read role without a second API call
        token['role'] = user.role
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['tenant_schema'] = _tenant_claims(user).get('tenant_schema')
        token['tenant_id'] = _tenant_claims(user).get('tenant_id')
        return token

    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except Exception as e:
            # Login failure (401) is handled by super()
            raise e

        # Attach the user profile to every login response
        try:
            user = self.user
            user_id_val = getattr(user, 'user_id', None) or getattr(user, 'pk', None)
            
            data['user'] = {
                'user_id':    str(user_id_val) if user_id_val else "",
                'email':      getattr(user, 'email', ''),
                'first_name': getattr(user, 'first_name', ''),
                'last_name':  getattr(user, 'last_name', ''),
                'role':       getattr(user, 'role', 'student'),
                'tenant': str(getattr(getattr(user, 'tenant', None), 'id', '') or ""),
                'tenant_schema': _tenant_claims(user).get('tenant_schema'),
                'tenant_features': _safe_tenant_features(user),
            }
        except Exception as e:
            import sys, traceback
            print(f"DEBUG: Login validation failed during profile attachment: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            # We don't want to crash the whole login if just plan features fail, 
            # but here it's better to log the exact cause of 500.
        
        return data




# User Registration Serializer
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.tokens import RefreshToken
import re

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    tokens = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = UserAccount
        fields = ['user_id', 'email', 'username', 'password', 'password_confirm', 
                  'first_name', 'last_name', 'tokens']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'username': {'required': False},
            'email': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email format and uniqueness"""
        # Email format validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format")
        
        # Check if email already exists
        if UserAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists")
        
        return value.lower()
    
    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def get_tokens(self, obj):
        """Generate JWT tokens for the user"""
        refresh = RefreshToken.for_user(obj)
        claims = _tenant_claims(obj)
        refresh["tenant_schema"] = claims["tenant_schema"]
        refresh["tenant_id"] = claims["tenant_id"]
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    
    def create(self, validated_data):
        """Create SaaS Admin user with hashed password"""
        validated_data.pop('password_confirm')
        
        # PUBLIC REGISTRATION IS FOR SAAS ADMINS ONLY
        role = 'saas_admin'
        
        from django.db import transaction
        with transaction.atomic():
            user = UserAccount.objects.create_user(
                email=validated_data['email'],
                username=validated_data.get('username', validated_data['email']),
                password=validated_data['password'],
                first_name=validated_data.get('first_name', ''),
                last_name=validated_data.get('last_name', ''),
                role=role,
                tenant=None,  # SaaS Admin is global
                is_staff=True,
                is_superuser=True
            )
        return user

class UserManagementSerializer(serializers.ModelSerializer):
    """Serializer used by admins to create/update users with roles and profiles"""
    
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = UserAccount
        fields = ['user_id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'tenant', 'is_active']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        role = validated_data.get('role', 'student')
        
        from django.db import transaction
        with transaction.atomic():
            user = UserAccount(**validated_data)
            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save()
            
            # Create corresponding profile if it's a tenant-scoped role
            tenant = validated_data.get('tenant')
            if tenant:
                if role == 'student':
                    from academic.models import Student
                    Student.objects.get_or_create(user=user)
                elif role == 'teacher':
                    from academic.models import Teacher
                    Teacher.objects.get_or_create(user=user)
                elif role == 'parent':
                    from academic.models import Parent
                    Parent.objects.get_or_create(user=user)
        return user

    def update(self, instance, validated_data):
        previous_role = instance.role
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        role_changed = 'role' in validated_data and validated_data['role'] != instance.role
        new_role = validated_data.get('role', instance.role)
        
        instance = super().update(instance, validated_data)
        
        if role_changed and instance.tenant:
            # Handle profile creation if role changed
            if new_role == 'student':
                from academic.models import Student
                Student.objects.get_or_create(user=instance)
            elif new_role == 'teacher':
                from academic.models import Teacher
                Teacher.objects.get_or_create(user=instance)
            elif new_role == 'parent':
                from academic.models import Parent
                Parent.objects.get_or_create(user=instance)

        if role_changed:
            request = self.context.get("request")
            record_audit_event(
                action="users.role_changed",
                user=getattr(request, "user", None),
                request=request,
                details={
                    "target_user_id": str(instance.user_id),
                    "target_email": instance.email,
                    "previous_role": previous_role,
                    "new_role": new_role,
                },
            )

        return instance

# Password Reset Serializers
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not UserAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email does not exist.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
            
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            self.user = UserAccount.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, UserAccount.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid user ID."})

        if not default_token_generator.check_token(self.user, attrs['token']):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        return attrs

    def save(self):
        self.user.set_password(self.validated_data['new_password'])
        self.user.save()
        return self.user
