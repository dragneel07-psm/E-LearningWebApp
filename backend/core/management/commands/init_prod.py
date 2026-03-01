from django.core.management.base import BaseCommand
from core.models.tenant import Tenant, Domain
import os

class Command(BaseCommand):
    help = 'Initializes the production public tenant and domain'

    def handle(self, *args, **options):
        self.stdout.write("Checking for public tenant...")
        
        # 1. Ensure Public Tenant exists
        tenant, created = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Global Admin App',
                'type': 'premium',
                'status': 'active'
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('✅ Created public tenant.'))
        else:
            self.stdout.write(self.style.NOTICE('ℹ️ Public tenant already exists.'))

        # 2. Ensure Domain exists
        # Use the Railway URL from logs or fallback to a default
        prod_domain = 'e-learningwebapp-production-1112.up.railway.app'
        
        domain, d_created = Domain.objects.get_or_create(
            tenant=tenant,
            domain=prod_domain,
            defaults={'is_primary': True}
        )

        if d_created:
            self.stdout.write(self.style.SUCCESS(f'✅ Created domain: {prod_domain}'))
        else:
            self.stdout.write(self.style.NOTICE(f'ℹ️ Domain {prod_domain} already exists.'))
        
        self.stdout.write(self.style.SUCCESS('🚀 Production initialization complete.'))
