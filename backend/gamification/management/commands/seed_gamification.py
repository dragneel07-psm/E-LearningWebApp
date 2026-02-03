from django.core.management.base import BaseCommand
from core.models.tenant import Tenant
from gamification.models import Badge

class Command(BaseCommand):
    help = 'Seeds initial gamification data (badges) for all tenants'

    def handle(self, *args, **options):
        tenants = Tenant.objects.all()
        
        badges_data = [
            {
                'name': 'First Step',
                'description': 'Complete your first lesson',
                'icon_name': 'footprints',
                'criteria_type': 'lessons_completed',
                'criteria_value': 1,
                'xp_reward': 50
            },
            {
                'name': 'On Fire',
                'description': 'Maintain a 3-day learning streak',
                'icon_name': 'flame',
                'criteria_type': 'streak_days',
                'criteria_value': 3,
                'xp_reward': 150
            },
            {
                'name': 'Unstoppable',
                'description': 'Maintain a 7-day learning streak',
                'icon_name': 'zap',
                'criteria_type': 'streak_days',
                'criteria_value': 7,
                'xp_reward': 500
            },
            {
                'name': 'Quiz Master',
                'description': 'Score 100% on a quiz',
                'icon_name': 'trophy',
                'criteria_type': 'perfect_score',
                'criteria_value': 1,
                'xp_reward': 200
            },
            {
                'name': 'Dedicated Scholar',
                'description': 'Complete 10 lessons',
                'icon_name': 'book-open',
                'criteria_type': 'lessons_completed',
                'criteria_value': 10,
                'xp_reward': 300
            }
        ]

        self.stdout.write(f"Found {tenants.count()} tenants")

        for tenant in tenants:
            self.stdout.write(f"Seeding badges for tenant: {tenant.name}")
            for data in badges_data:
                badge, created = Badge.objects.get_or_create(
                    tenant=tenant,
                    name=data['name'],
                    defaults=data
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"  Created badge: {badge.name}"))
                else:
                    self.stdout.write(f"  Badge already exists: {badge.name}")

        self.stdout.write(self.style.SUCCESS("Gamification seeding completed!"))
