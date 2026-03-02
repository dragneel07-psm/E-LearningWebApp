# core/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Tenant, AuditLog, GlobalSettings
from .serializers import TenantSerializer, AuditLogSerializer, GlobalSettingsSerializer, TenantCreateSerializer
from rest_framework.views import APIView
from django.db import connection
import shutil
import random

from .utils.tenant_db import provision_tenant_db, get_tenant_db_alias
from .utils.tenant_users import create_tenant_admin
from .utils.tenant_users import create_tenant_admin
from django.conf import settings
from django.core.management import call_command
import os
import glob
from datetime import datetime, timedelta
from django.utils import timezone

class TenantCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # We only consider it a "School Code" match if it resolved to a non-public tenant
        if request.tenant and request.tenant.schema_name != 'public':
            return Response({
                "exists": True,
                "name": request.tenant.name,
                "schema_name": request.tenant.schema_name,
                "id": str(request.tenant.id)
            })
        return Response({"exists": False}, status=status.HTTP_404_NOT_FOUND)

from .views_saas import IsSaaSAdmin

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    permission_classes = [IsSaaSAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return TenantCreateSerializer
        return TenantSerializer

    def perform_create(self, serializer):
        print("Creating Tenant...")
        from django_tenants.utils import schema_context
        from .models.tenant import Domain
        
        # 1. Prepare Data
        subdomain = serializer.validated_data.get('subdomain')
        admin_email = serializer.validated_data.get('admin_email')
        admin_pass = serializer.validated_data.get('password')
        first = serializer.validated_data.get('admin_first_name')
        last = serializer.validated_data.get('admin_last_name')
        selected_plan = serializer.validated_data.get('plan')

        # 2. Save Tenant (schema_name is mandatory for TenantMixin)
        # We use the subdomain as the schema name for consistency
        tenant = serializer.save(schema_name=subdomain)
        print(f"Tenant '{tenant.name}' saved with schema '{tenant.schema_name}'")

        try:
            # 3. Create Domain
            # For local dev, we use .localhost. For prod, we should use the actual base domain.
            # Domain resolution in django-tenants handles the routing.
            base_domain = os.environ.get('BASE_DOMAIN', 'localhost')
            domain_url = f"{subdomain}.{base_domain}"
            
            Domain.objects.create(
                domain=domain_url,
                tenant=tenant,
                is_primary=True
            )
            print(f"Domain '{domain_url}' created for tenant.")

            # 4. Create a default Trial Subscription for the new tenant
            try:
                from billing.models import Subscription, SubscriptionPlan
                # Required by serializer, but keep a safe fallback.
                plan = selected_plan or SubscriptionPlan.objects.filter(is_active=True).order_by('name').first()
                if not plan:
                    raise ValueError("No active subscription plan found.")
                
                Subscription.objects.create(
                    tenant=tenant,
                    plan=plan,
                    status='trial',
                    billing_cycle='monthly',
                    end_date=timezone.now().date() + timedelta(days=15),
                    student_limit=plan.student_limit,
                    storage_limit_gb=plan.storage_limit_gb,
                    ai_token_limit=plan.ai_token_limit,
                )
                print(f"15-day trial subscription created for {tenant.name} on plan {plan.name}")
            except Exception as sub_err:
                raise RuntimeError(f"Failed to create trial subscription for {tenant.name}: {sub_err}")

            # 4. Create Admin User inside the new tenant schema
            if admin_email and admin_pass:
                with schema_context(tenant.schema_name):
                    create_tenant_admin(tenant, admin_email, admin_pass, first, last)
                
                print(f"--- TENANT PROVISIONED: {tenant.name} ---")
                print(f"URL: http://{domain_url}:3000")
                print(f"Admin: {admin_email}")
                print(f"----------------------------------------")
                
        except Exception as e:
            print(f"Provisioning failed for {subdomain}: {e}")
            # Cleanup to avoid partial tenant setup
            try:
                tenant.delete()
            except Exception as delete_error:
                print(f"Failed to cleanup tenant record: {delete_error}")
            raise e

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]

class GlobalSettingsViewSet(viewsets.ViewSet):
    """
    Singleton ViewSet for Global System Settings.
    The 'list' action (GET /api/core/settings/) returns the single instance.
    The 'create' or 'update' action (POST/PUT) updates that single instance.
    """
    permission_classes = [IsSaaSAdmin]

    def list(self, request):
        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings)
        return Response(serializer.data)

    def create(self, request):
        # Handle POST as update for singleton
        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        # Handle PUT/PATCH explicitly if router calls it
        settings, _ = GlobalSettings.objects.get_or_create(pk=1)
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # We can also support update/partial_update if the router expects it, but 'list' and 'create' covers GET/POST for singleton.
    # Actually, often 'list' is mapped to GET / and 'create' to POST /.

class SystemStatusView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # 1. Check Database Status
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_status = "Operational"
        except Exception:
            db_status = "Degraded"

        # 2. Disk Usage
        total, used, free = shutil.disk_usage("/")
        total_gb = total // (2**30)
        used_gb = used // (2**30)
        free_gb = free // (2**30)

        # 3. Simulated API Latency
        latency = random.randint(20, 150) # ms

        return Response({
            "status": db_status,
            "latency": f"{latency}ms",
            "storage": {
                "total": f"{total_gb} GB",
                "used": f"{used_gb} GB",
                "free": f"{free_gb} GB",
                "percent": round((used / total) * 100, 1)
            }
        })

class BackupViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        files = glob.glob(os.path.join(backup_dir, "*.sqlite3"))
        files.sort(key=os.path.getmtime, reverse=True)
        
        backups = []
        for f in files:
            stats = os.stat(f)
            backups.append({
                "filename": os.path.basename(f),
                "created_at": datetime.fromtimestamp(stats.st_mtime),
                "size_bytes": stats.st_size,
                "size_mb": round(stats.st_size / (1024 * 1024), 2)
            })
            
        return Response(backups)

    def create(self, request):
        # Trigger backup for current tenant or all?
        # For simplicity, let's backup ALL or allow param.
        # User might be on a tenant domain -> backup that tenant.
        
        schema = request.data.get('schema')
        
        try:
            if schema:
                call_command('backup_tenant', schema=schema)
            elif request.tenant.schema_name != 'public':
                call_command('backup_tenant', schema=request.tenant.schema_name)
            else:
                # If on public/admin, maybe backup all? Or require schema.
                # Let's default to backing up 'demo' if nothing specified for ease of use in dev
                # Or better: verify 'all' param
                if request.data.get('all'):
                    call_command('backup_tenant', all=True)
                else:
                    # Default behavior for admin panel: Backup demo tenant if no schema
                    call_command('backup_tenant', schema='demo') 
                    
            return Response({"status": "Backup created successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
