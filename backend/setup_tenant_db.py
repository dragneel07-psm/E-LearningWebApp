#!/usr/bin/env python3
"""
Script to set up tenant database and run migrations
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command
from django.conf import settings
from core.models.tenant import Tenant

def setup_tenant_database(tenant_domain='pramod.localhost'):
    """Set up database for a specific tenant"""
    try:
        # Get the tenant
        tenant = Tenant.objects.get(domain_url=tenant_domain)
        print(f'✓ Found tenant: {tenant.name}')
        print(f'  Domain: {tenant.domain_url}')
        print(f'  Database alias: {tenant.db_alias}')
        print(f'  Database file: {tenant.db_name}')
        
        # Ensure the database configuration exists
        if tenant.db_alias not in settings.DATABASES:
            print(f'\n⚠ Adding {tenant.db_alias} to DATABASES configuration...')
            new_db_config = settings.DATABASES['default'].copy()
            new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
            settings.DATABASES[tenant.db_alias] = new_db_config
            print(f'✓ Database configuration added')
        
        # Run migrations
        print(f'\n📦 Running migrations for {tenant.db_alias}...')
        call_command('migrate', database=tenant.db_alias, verbosity=2, interactive=False)
        
        print(f'\n✅ Tenant database setup completed successfully!')
        print(f'   Database file: {settings.BASE_DIR / tenant.db_name}')
        
        return True
        
    except Tenant.DoesNotExist:
        print(f'❌ Tenant with domain "{tenant_domain}" not found!')
        print('\nAvailable tenants:')
        tenants = Tenant.objects.all()
        if tenants.exists():
            for t in tenants:
                print(f'  - {t.name}: {t.domain_url} -> {t.db_name}')
        else:
            print('  (No tenants found in database)')
        return False
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    tenant_domain = sys.argv[1] if len(sys.argv) > 1 else 'pramod.localhost'
    success = setup_tenant_database(tenant_domain)
    sys.exit(0 if success else 1)
