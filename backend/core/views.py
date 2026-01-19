# core/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Tenant, AuditLog, GlobalSettings
from .serializers import TenantSerializer, AuditLogSerializer, GlobalSettingsSerializer
from rest_framework.views import APIView
from django.db import connection
import shutil
import random

from .utils.tenant_db import provision_tenant_db, get_tenant_db_alias
from django.conf import settings

class TenantCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.tenant:
            return Response({
                "exists": True,
                "name": request.tenant.name,
                "tenant_id": request.tenant.tenant_id
            })
        return Response({"exists": False}, status=status.HTTP_404_NOT_FOUND)

class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer

    def perform_create(self, serializer):
        print("Creating Tenant...")
        # 1. Validate / Generate Defaults
        data = serializer.validated_data
        subdomain = data.get('subdomain')
        print(f"Subdomain: {subdomain}")
        
        if not data.get('db_name'):
            serializer.validated_data['db_name'] = f"school_{subdomain}.sqlite3"
        if not data.get('db_alias'):
            serializer.validated_data['db_alias'] = get_tenant_db_alias(subdomain)
        if not data.get('domain_url'):
            # TODO: Get base domain from GlobalSettings or ENV
            serializer.validated_data['domain_url'] = f"{subdomain}.localhost"

        print(f"Final Data: {serializer.validated_data}")

        # 2. Save Tenant
        tenant = serializer.save()
        print(f"Tenant Saved: {tenant.tenant_id}")

        # 3. Provision Database
        try:
            print("Provisioning DB...")
            provision_tenant_db(tenant)
            print("Provisioning Success via ViewSet")
            
            # 4. Create School Admin User (if provided)
            admin_email = self.request.data.get('admin_email')
            admin_password = self.request.data.get('admin_password')
            admin_username = self.request.data.get('admin_username', 'admin') # Default to 'admin'
            
            if admin_email and admin_password:
                print(f"Creating School Admin: {admin_username} ({admin_email})")
                from django.contrib.auth import get_user_model
                User = get_user_model()
                
                # Create in the specific Tenant DB
                User.objects.db_manager(tenant.db_alias).create_user(
                    username=admin_username,
                    email=admin_email,
                    password=admin_password,
                    role='admin', # School Admin
                    tenant=tenant,
                    is_staff=True, # Optional: if you want them to access school admin panel
                    is_superuser=False
                )
                print("School Admin Created.")
                
        except Exception as e:
            # If provisioning fails, we should probably rollback/delete tenant?
            # For dev, just log.
            print(f"Provisioning failed: {e}")
            import traceback
            traceback.print_exc()

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
    permission_classes = [permissions.IsAuthenticated] # Restrict to SaaS Admins ideally

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
