from django.core.management.base import BaseCommand
from core.models.tenant import Tenant, Domain

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

        # 2. Ensure Domains exist
        # Both production and localhost for robustness
        domains = [
            'e-learningwebapp-production-1112.up.railway.app',
            'localhost',
            '127.0.0.1'
        ]
        
        for d in domains:
            domain, d_created = Domain.objects.update_or_create(
                domain=d,
                defaults={'tenant': tenant, 'is_primary': (d == domains[0])}
            )
            if d_created:
                self.stdout.write(self.style.SUCCESS(f'✅ Created domain: {d}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'✅ Verified/Updated domain: {d}'))
        
        self.stdout.write(self.style.SUCCESS('🚀 Production initialization complete.'))
