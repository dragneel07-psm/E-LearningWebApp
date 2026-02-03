import os
import django
import random
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from core.models import Tenant
from billing.models import Invoice, Subscription, SubscriptionPlan
from ai_engine.models import AIInteractionLog
from django.conf import settings

def seed_saas_intelligence():
    print("🚀 Initializing SaaS Platform Intelligence Seeding...")
    
    # 1. Ensure Subscription Plans exist
    plans = [
        {'name': 'Basic', 'price': 99.00, 'tokens': 50000},
        {'name': 'Pro', 'price': 299.00, 'tokens': 200000},
        {'name': 'Enterprise', 'price': 999.00, 'tokens': 1000000},
    ]
    
    for p_data in plans:
        SubscriptionPlan.objects.get_or_create(
            name=p_data['name'],
            defaults={
                'price_monthly': Decimal(p_data['price']),
                'ai_token_limit': p_data['tokens'],
                'currency': 'USD'
            }
        )
    
    all_plans = list(SubscriptionPlan.objects.all())
    tenants = Tenant.objects.all()
    
    if not tenants:
        print("❌ No tenants found. Please create at least one tenant first.")
        return

    for tenant in tenants:
        print(f"📦 Seeding data for tenant: {tenant.name} ({tenant.subdomain})")
        
        # 2. Ensure Subscription exists
        sub, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                'plan': random.choice(all_plans),
                'status': 'active',
                'billing_cycle': 'monthly'
            }
        )

        # 3. Seed Revenue (Invoices) - Last 6 months
        Invoice.objects.filter(tenant=tenant).delete() # Reset for clean demo
        for i in range(12): # 12 invoices distributed over last 6 months
            days_ago = i * 15
            issued_date = timezone.now() - timedelta(days=days_ago)
            status = random.choice(['paid', 'paid', 'paid', 'pending'])
            
            Invoice.objects.create(
                tenant=tenant,
                subscription=sub,
                amount=Decimal(random.randint(500, 2500)),
                status=status,
                issued_date=issued_date,
                paid_date=issued_date if status == 'paid' else None
            )
        
        # 4. Seed AI Logs - Direct DB entry if SHARED or Dynamic if Tenant-specific
        db_alias = tenant.db_alias
        if db_alias not in settings.DATABASES:
            # Register on the fly for script
            new_db_config = settings.DATABASES['default'].copy()
            new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
            settings.DATABASES[db_alias] = new_db_config
            
        print(f"🤖 Generating AI logs for {tenant.name} in {db_alias}...")
        
        # Clear existing logs in tenant DB
        AIInteractionLog.objects.using(db_alias).all().delete()
        
        features = ['Tutor Chat', 'Predictive Analytics', 'Study Planner']
        for _ in range(50): # 50 logs per tenant
            feature = random.choice(features)
            tokens = random.randint(500, 5000)
            timestamp = timezone.now() - timedelta(days=random.randint(0, 30))
            
            AIInteractionLog.objects.using(db_alias).create(
                tenant=tenant,
                feature_used=feature,
                total_tokens=tokens,
                cost_estimated=Decimal(tokens * 0.00002),
                timestamp=timestamp
            )

    print("✅ SaaS Intelligence Seeding Complete! Dashboard is now live.")

if __name__ == "__main__":
    seed_saas_intelligence()
