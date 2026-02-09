from django.core.management.base import BaseCommand
from core.models import Tenant
from gamification.models import Badge

class Command(BaseCommand):
    help = 'Seeds default gamification badges for all tenants'

    def handle(self, *args, **options):
        self.stdout.write("Seeding gamification badges...")
        
        tenants = Tenant.objects.all()
        
        badges_data = [
            {
                'name': 'First Step',
                'description': 'Completed your first lesson',
                'icon_name': 'footprints',
                'criteria_type': 'lessons_completed',
                'criteria_value': 1,
                'xp_reward': 50
            },
            {
                'name': 'On Fire',
                'description': 'Completed 5 lessons',
                'icon_name': 'flame',
                'criteria_type': 'lessons_completed',
                'criteria_value': 5,
                'xp_reward': 200
            },
            {
                'name': 'Scholar',
                'description': 'Completed 20 lessons',
                'icon_name': 'graduation-cap',
                'criteria_type': 'lessons_completed',
                'criteria_value': 20,
                'xp_reward': 500
            },
             {
                'name': 'Quiz Master',
                'description': 'Scored 100% on a quiz',
                'icon_name': 'trophy',
                'criteria_type': 'perfect_score',
                'criteria_value': 1,
                'xp_reward': 100
            }
        ]

        if not tenants.exists():
             self.stdout.write(self.style.WARNING("No tenants found! run init_tenant first."))
             return

        from core.middleware.tenant import _thread_locals
        from django.conf import settings
        from django.db import connections

        for tenant in tenants:
            self.stdout.write(f"Processing tenant: {tenant.name}")
            
            # Set thread local for routing
            _thread_locals.tenant = tenant
            _thread_locals.db_alias = tenant.db_alias

            # Dynamic Database Registration
            if tenant.db_alias not in settings.DATABASES:
                new_db_config = settings.DATABASES['default'].copy()
                new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
                settings.DATABASES[tenant.db_alias] = new_db_config
                connections.databases[tenant.db_alias] = new_db_config

            for b_data in badges_data:
                # Use defaults to update if needed, but primarily get_or_create by name/tenant
                badge, created = Badge.objects.get_or_create(
                    tenant=tenant,
                    name=b_data['name'],
                    defaults=b_data
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"  + Created badge: {badge.name}"))
                else:
                    # Update existing badge
                    for key, value in b_data.items():
                        setattr(badge, key, value)
                    badge.save()
                    self.stdout.write(f"  . Updated/Verified badge: {badge.name}")
            
            # Reset context
            _thread_locals.tenant = None
            _thread_locals.db_alias = 'default'
        
        self.stdout.write(self.style.SUCCESS("Gamification seeding complete!"))
