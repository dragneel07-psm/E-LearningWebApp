import os
import django
import sys
from django.core.management import call_command

# Setup Django
sys.path.append('/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from core.models import Tenant
from django.conf import settings
from django.db import connections

def migrate_tenant(subdomain):
    try:
        tenant = Tenant.objects.get(subdomain=subdomain)
        print(f"Migrating tenant: {tenant.subdomain}")
        
        # Tenant DBs are stored in backend/config/
        db_path = settings.BASE_DIR / "config" / tenant.db_name
        
        # Register DB
        if tenant.db_alias not in settings.DATABASES:
            new_db_config = settings.DATABASES['default'].copy()
            new_db_config['NAME'] = db_path
            settings.DATABASES[tenant.db_alias] = new_db_config
            connections.databases[tenant.db_alias] = new_db_config
            
        # Run Migration
        call_command('migrate', database=tenant.db_alias, interactive=False)
        print("Migration successful")
        
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate_tenant('demo')
