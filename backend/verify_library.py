import os
import django
import sys
from datetime import date, timedelta

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from academic.models import Student
from library.models import Book, BookIssue
from core.models import Tenant
from core.middleware.tenant import _thread_locals

def run_verification():
    # 1. Setup Tenant Context
    try:
        tenant = Tenant.objects.get(subdomain='demo')
    except Tenant.DoesNotExist:
        print("❌ Demo tenant not found!")
        return

    # Manually set tenant context
    _thread_locals.tenant = tenant
    _thread_locals.db_alias = tenant.db_alias

    # Dynamic Database Registration
    from django.conf import settings
    from django.db import connections
    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES['default'].copy()
        new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = new_db_config
        connections.databases[tenant.db_alias] = new_db_config
    
    print(f"🌍 Using Tenant: {tenant.name} ({tenant.subdomain}) -> DB Alias: {tenant.db_alias}")

    # 2. Get a Student
    student = Student.objects.first()
    if not student:
        print("❌ No students found!")
        return
    print(f"👨‍🎓 Testing with student: {student.user.first_name} {student.user.last_name}")

    # 3. Get a Book
    book = Book.objects.first()
    if not book:
        print("❌ No books found! Run seed_library first.")
        return
    print(f"📖 Testing with book: {book.title} (Available: {book.available_copies})")

    # 4. Issue a Book
    print("\n--- Testing Book Issue ---")
    initial_copies = book.available_copies
    
    # Ensure no previous issues for this student/book to keep it clean
    BookIssue.objects.filter(student=student, book=book, status='issued').delete()
    
    issue = BookIssue.objects.create(
        book=book,
        student=student,
        due_date=date.today() + timedelta(days=14)
    )
    
    # Re-fetch book to check available_copies
    book.refresh_from_db()
    print(f"✅ Book issued successfully. ID: {issue.issue_id}")
    print(f"📉 Available copies updated: {initial_copies} -> {book.available_copies}")
    
    if book.available_copies == initial_copies - 1:
        print("✅ Stock reduction verified.")
    else:
        print("❌ Stock reduction failed!")

    # 5. Return the Book
    print("\n--- Testing Book Return ---")
    issue.status = 'returned'
    issue.return_date = date.today()
    issue.save()
    
    # Manually update stock in return if model doesn't handle it in save()
    # Let's check if models.py handles incrementing copies on return.
    # Looking at library/models.py (lines 110-128), it ONLY decrements on creation.
    # It does NOT seem to increment on return. Let's fix that in models.py if needed.
    # Wait, I should verify first.
    
    book.refresh_from_db()
    print(f"🔄 Book returned. Current available: {book.available_copies}")
    
    if book.available_copies == initial_copies:
        print("✅ Stock increment verified.")
    else:
        print("❌ Stock increment failed! (Models.py may need update)")

if __name__ == "__main__":
    run_verification()
