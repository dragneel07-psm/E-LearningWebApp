import os
import django

print("Starting debug script...")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
print("Environment set, setting up django...")
django.setup()
print("Django setup complete.")

from core.models.tenant import Tenant
from users.models import UserAccount

def debug():
    with open('debug_output.txt', 'w') as f:
        f.write("--- Tenant Database Debug ---\n")
        tenants = Tenant.objects.all()
        f.write(f"Total Tenants: {tenants.count()}\n")
        for t in tenants:
            f.write(f"  - {t.name} ({t.subdomain}) [{t.domain_url}]\n")

        users = UserAccount.objects.all()
        f.write(f"\nTotal Users: {users.count()}\n")
        for u in users:
            f.write(f"  - {u.username} (Role: {u.role}, Tenant: {u.tenant.name if u.tenant else 'NONE'})\n")

        if not tenants.exists():
            f.write("\nCreating default tenant...\n")
            tenant = Tenant.objects.create(
                name='Pramod School', 
                subdomain='pramod', 
                domain_url='localhost',
                db_name='school_pramod.sqlite3',
                db_alias='school_pramod'
            )
            f.write(f"Created tenant: {tenant.name}\n")
        else:
            tenant = tenants.first()

        for u in users:
            if not u.tenant:
                u.tenant = tenant
                u.save()
                f.write(f"Associated user {u.username} with tenant {tenant.name}\n")

if __name__ == "__main__":
    print("Running debug script...")
    debug()
    print("Done.")
