import os
import django
from django.conf import settings
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Tenant

def migrate_tenants():
    print("🚀 Starting Tenant Migration")
    
    # 1. Get Tenant
    try:
        t = Tenant.objects.get(subdomain='demo')
    except Tenant.DoesNotExist:
        print("Demo tenant not found!")
        return

    print(f"🔹 Migrating Tenant: {t.name} ({t.db_alias})")
    print(f"   DB Name: {t.db_name}")

    # 2. Configure DB
    if t.db_alias not in settings.DATABASES:
         new_db_config = settings.DATABASES['default'].copy()
         new_db_config['NAME'] = settings.BASE_DIR / t.db_name # Use exact db_name from model
         print(f"   Mapped Path: {new_db_config['NAME']}")
         settings.DATABASES[t.db_alias] = new_db_config

    # 3. Check State
    print("\n--- Migration Status ---")
    call_command('showmigrations', database=t.db_alias)

    # 4. Migrate
    print("\n--- Running Migrate ---")
    call_command('migrate', database=t.db_alias)
    
    print("✅ Migration Complete")

if __name__ == "__main__":
    migrate_tenants()
