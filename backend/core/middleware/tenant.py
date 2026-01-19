from django.conf import settings
from django.db import connections
from django.utils.deprecation import MiddlewareMixin
from django.http import Http404
from core.models.tenant import Tenant
import threading

# Thread-local storage for current tenant
_thread_locals = threading.local()

def get_current_tenant():
    return getattr(_thread_locals, 'tenant', None)

def get_current_db_alias():
    return getattr(_thread_locals, 'db_alias', 'default')

class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # 1. Get Host Logic
        host = request.get_host().split(':')[0] # Remove port
        
        # 2. Identify Tenant
        try:
            # Check for specific domain match
            tenant = Tenant.objects.get(domain_url=host)
            
            # Configure Request and Thread-Local
            request.tenant = tenant
            request.db_alias = tenant.db_alias
            
            _thread_locals.tenant = tenant
            _thread_locals.db_alias = tenant.db_alias

            # 3. Dynamic Database Registration (If needed)
            if tenant.db_alias not in settings.DATABASES:
                # Add to settings.DATABASES runtime (simplified for SQLite)
                # In prod (Postgres), db_name would be the schema name usually, 
                # but with django connections we can define a full DB config.
                
                new_db_config = settings.DATABASES['default'].copy()
                new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
                
                settings.DATABASES[tenant.db_alias] = new_db_config
                connections.databases[tenant.db_alias] = new_db_config
            
        except Tenant.DoesNotExist:
            # Fallback for localhost or SaaS Admin
            # Ideally, specific domains are SaaS Admin, others are Tenants.
            # If no match, assume it's the Public Interface (SaaS Admin)
            request.tenant = None
            request.db_alias = 'default'
            _thread_locals.tenant = None
            _thread_locals.db_alias = 'default'

    def process_response(self, request, response):
        # Clean up thread locals
        if hasattr(_thread_locals, 'tenant'):
            del _thread_locals.tenant
        if hasattr(_thread_locals, 'db_alias'):
            del _thread_locals.db_alias
        return response
