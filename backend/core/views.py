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
    # permission_classes = [permissions.IsAdminUser] # Should be SaaS Admin only

    def get_serializer_class(self):
        if self.action == 'create':
            return TenantCreateSerializer
        return TenantSerializer

    def perform_create(self, serializer):
        print("Creating Tenant...")
        
        # 1. Prepare Data
        subdomain = serializer.validated_data.get('subdomain')
        db_name = f"school_{subdomain}.sqlite3"
        db_alias = get_tenant_db_alias(subdomain)
        # TODO: Get base domain from settings
        domain_url = f"{subdomain}.localhost"

        # Capture Admin Data BEFORE save (as serializer.create pops them)
        admin_email = serializer.validated_data.get('admin_email')
        admin_pass = serializer.validated_data.get('password')
        first = serializer.validated_data.get('admin_first_name')
        last = serializer.validated_data.get('admin_last_name')

        # 2. Save Tenant (defaults)
        serializer.save(db_name=db_name, db_alias=db_alias, domain_url=domain_url)
        tenant = serializer.instance
        print(f"Tenant Saved: {tenant.tenant_id}")

        # 3. Provision Database
        try:
            print("Provisioning DB...")
            provision_tenant_db(tenant)
            
            # 4. Create Admin (using captured data)
            if admin_email and admin_pass:
                create_tenant_admin(tenant, admin_email, admin_pass, first, last)
                
                # 5. Send Email (Mock)
                print(f"--- WELCOME EMAIL ({admin_email}) ---\nURL: http://{domain_url}:3000\nUser: {admin_email}\nPass: {admin_pass}\n-------------------------------")
                
        except Exception as e:
            print(f"Provisioning failed: {e}")
            # Ensure we delete the tenant if provisioning fails to avoid zombie records
            try:
                tenant.delete()
            except Exception as delete_error:
                print(f"Failed to cleanup tenant after provisioning error: {delete_error}")
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
