import os
import django
import random
import json
from urllib.request import urlopen
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from core.models import Tenant
from billing.models import Invoice, Subscription, SubscriptionPlan
from ai_engine.models import AIInteractionLog
from django.conf import settings

MARKET_FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD"
DEFAULT_USD_TO_NPR = Decimal('132.00')
MIN_YEARLY_BENEFIT_PERCENT = Decimal('50')


def fetch_usd_to_npr_rate() -> Decimal:
    """
    Fetch live USD->NPR market FX with a safe fallback for offline/dev runs.
    """
    try:
        with urlopen(MARKET_FX_ENDPOINT, timeout=10) as response:
            payload = json.loads(response.read().decode('utf-8'))
        rate = payload.get('rates', {}).get('NPR')
        if rate is None:
            raise ValueError("NPR rate missing in market response")
        return Decimal(str(rate))
    except Exception as exc:
        print(f"⚠️  Could not fetch live FX rate, using fallback {DEFAULT_USD_TO_NPR} NPR/USD. Error: {exc}")
        return DEFAULT_USD_TO_NPR


def to_nearest_hundred(amount: Decimal) -> Decimal:
    return (amount / Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * Decimal('100')


def derive_market_prices(base_usd_monthly: Decimal, usd_to_npr: Decimal) -> tuple[Decimal, Decimal]:
    monthly_npr = to_nearest_hundred(base_usd_monthly * usd_to_npr)
    yearly_npr = to_nearest_hundred(monthly_npr * Decimal('12') * (Decimal('1') - (MIN_YEARLY_BENEFIT_PERCENT / Decimal('100'))))
    return monthly_npr, yearly_npr


def seed_saas_intelligence():
    print("🚀 Initializing SaaS Platform Intelligence Seeding...")
    usd_to_npr = fetch_usd_to_npr_rate()
    print(f"💹 Live USD->NPR market rate: {usd_to_npr}")
    
    # 1. Ensure Subscription Plans exist
    basic_monthly, basic_yearly = derive_market_prices(Decimal('39'), usd_to_npr)
    standard_monthly, standard_yearly = derive_market_prices(Decimal('99'), usd_to_npr)
    premium_monthly, premium_yearly = derive_market_prices(Decimal('199'), usd_to_npr)
    enterprise_monthly, enterprise_yearly = derive_market_prices(Decimal('399'), usd_to_npr)
    plans = [
        {
            'name': 'Basic',
            'description': 'For small schools starting digital learning operations.',
            'price_monthly': basic_monthly,
            'price_yearly': basic_yearly,
            'currency': 'NPR',
            'student_limit': 300,
            'teacher_limit': 20,
            'storage_limit_gb': 50,
            'ai_token_limit': 100000,
            'has_ai_tutor': False,
            'has_ai_eval': False,
            'has_parent_portal': True,
            'has_analytics': False,
            'has_career_guidance': False,
            'is_active': True,
        },
        {
            'name': 'Standard',
            'description': 'Balanced package for growing schools with AI support and analytics.',
            'price_monthly': standard_monthly,
            'price_yearly': standard_yearly,
            'currency': 'NPR',
            'student_limit': 1000,
            'teacher_limit': 80,
            'storage_limit_gb': 200,
            'ai_token_limit': 500000,
            'has_ai_tutor': True,
            'has_ai_eval': False,
            'has_parent_portal': True,
            'has_analytics': True,
            'has_career_guidance': False,
            'is_active': True,
        },
        {
            'name': 'Premium',
            'description': 'Advanced AI and analytics for large institutions with higher scale.',
            'price_monthly': premium_monthly,
            'price_yearly': premium_yearly,
            'currency': 'NPR',
            'student_limit': 3000,
            'teacher_limit': 250,
            'storage_limit_gb': 1024,
            'ai_token_limit': 2000000,
            'has_ai_tutor': True,
            'has_ai_eval': True,
            'has_parent_portal': True,
            'has_analytics': True,
            'has_career_guidance': True,
            'is_active': True,
        },
        {
            'name': 'Enterprise',
            'description': 'High-scale deployment for school groups and universities.',
            'price_monthly': enterprise_monthly,
            'price_yearly': enterprise_yearly,
            'currency': 'NPR',
            'student_limit': 10000,
            'teacher_limit': 800,
            'storage_limit_gb': 3072,
            'ai_token_limit': 5000000,
            'has_ai_tutor': True,
            'has_ai_eval': True,
            'has_parent_portal': True,
            'has_analytics': True,
            'has_career_guidance': True,
            'is_active': True,
        },
    ]
    
    for p_data in plans:
        SubscriptionPlan.objects.update_or_create(
            name=p_data['name'],
            defaults=p_data
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
                currency='NPR',
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
