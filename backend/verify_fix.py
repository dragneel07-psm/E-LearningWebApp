
import os
import sys
import django
import requests
import sqlite3

# Add current directory to path so we can import config
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from core.models.tenant import Tenant

output_file = "verification_result.txt"
results = []

def log(msg):
    print(msg)
    results.append(msg)

try:
    log("Starting verification...")
    
    # Check DB Columns manualy via sqlite3
    db_path = "backend/school_demo.sqlite3"
    if not os.path.exists(db_path):
        log(f"ERROR: DB File {db_path} not found.")
    else:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        try:
            cursor.execute("PRAGMA table_info(academic_notice)")
            columns = [info[1] for info in cursor.fetchall()]
            log(f"Columns in academic_notice: {columns}")
            
            required = ['category', 'priority', 'attachment', 'expiry_date', 'id']
            missing = [col for col in required if col not in columns]
            
            if missing:
                log(f"FAILURE: Missing columns: {missing}")
            else:
                log("SUCCESS: All required columns found in academic_notice.")
                
            if 'notice_id' in columns:
                log("WARNING: notice_id column still exists (should rely on id).")
            else:
                log("CHECK: notice_id column is correctly absent.")
                
        except Exception as e:
            log(f"DB Error: {e}")
        finally:
            conn.close()

    # Check API Status
    try:
        url = "http://localhost:8000/api/academic/notices/"
        log(f"Checking API: {url}")
        # Need to simulate tenant host??
        # Usually localhost:8000 defaults to a tenant if configured or public?
        # The user error message showed "OperationalError at /api/academic/notices/".
        # So it is accessible.
        
        # We might need headers if tenant middleware requires it.
        # Assuming 'demo' subdomain maps to localhost or via headers?
        # The walkthrough says "Tenant: Demo School".
        # If I hit localhost:8000 directly, does it pick up a tenant?
        # In previous logs, it seemed to default to 'demo' or it was accessed via correct setup.
        # I'll try simple GET.
        
        response = requests.get(url)
        log(f"API Status Code: {response.status_code}")
        if response.status_code == 200:
             log("SUCCESS: API returned 200 OK.")
        else:
             log(f"FAILURE: API returned {response.status_code}. Content: {response.text[:200]}")

    except Exception as e:
        log(f"API Error: {e}")

except Exception as e:
    log(f"Critical Error: {e}")

with open(output_file, "w") as f:
    f.write("\n".join(results))

print("Verification complete. Results written to file.")
