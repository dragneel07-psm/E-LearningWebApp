import os
import django
import requests
import json
from datetime import datetime

# Setup Django standalone
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Tenant
import threading
from django.db import connection
from users.models import UserAccount
from rest_framework_simplejwt.tokens import RefreshToken

from django.conf import settings
from django.db import connections

def get_token_local(email):
    try:
        # Manually set tenant context for the thread
        tenant = Tenant.objects.get(subdomain='demo')
        
        # Manually register database if missing (mocking middleware)
        if tenant.db_alias not in settings.DATABASES:
             new_db_config = settings.DATABASES['default'].copy()
             new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
             settings.DATABASES[tenant.db_alias] = new_db_config
             connections.databases[tenant.db_alias] = new_db_config
        
        # Set thread locals
        from core.middleware.tenant import _thread_locals
        _thread_locals.tenant = tenant
        _thread_locals.db_alias = tenant.db_alias
        
        print("\n--- Users in Tenant DB ---")
        for u in UserAccount.objects.all():
            print(f"User: {u.email}")
            
        user = UserAccount.objects.get(email=email)
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    except Exception as e:
        print(f"Error getting token: {e}")
        return None

def verify_schedule():
    print("🚀 Starting Study Schedule Verification")

    # 1. Login as Student (Local Token Gen)
    student_email = "student@demo.com"
    token = get_token_local(student_email)
    
    if not token:
        print("❌ Token generation failed")
        return

    print(f"✅ Generated token for {student_email}")
    headers = {
        'Authorization': f'Bearer {token}',
        'Host': 'localhost' # Matches Tenant.domain_url set by create_test_accounts.py
    } 

    # 3. Generate Schedule
    print("\n--- Generating Schedule ---")
    gen_url = "http://localhost:8000/api/ai/study-schedule/generate/"
    try:
        res = requests.post(gen_url, headers=headers)
        if res.status_code == 200 or res.status_code == 201:
            events = res.json()
            print(f"✅ Schedule Generated: {len(events)} events created")
            if len(events) > 0:
                print(f"   Sample: {events[0]['title']} at {events[0]['start_time']}")
        else:
             print(f"❌ Generation failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"❌ Request Error: {e}")

    # 4. Fetch Schedule
    print("\n--- Fetching Schedule ---")
    list_url = "http://localhost:8000/api/ai/study-schedule/"
    try:
        res = requests.get(list_url, headers=headers)
        if res.status_code == 200:
            events = res.json()
            print(f"✅ Fetched Schedule: {len(events)} events found")
        else:
            print(f"❌ Fetch failed: {res.status_code}")
    except Exception as e:
        print(f"❌ Request Error: {e}")

if __name__ == "__main__":
    verify_schedule()
