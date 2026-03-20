# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
import os
import django
import sys

# Setup Django Environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from academic.models import Student, Lesson, LessonProgress
from gamification.models import Badge, StudentBadge, PointTransaction
from core.models import Tenant
# Correct import path based on previous usage
from core.middleware.tenant import _thread_locals
from core.models import Tenant

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

    # 3. Get a Lesson
    lesson = Lesson.objects.first()
    if not lesson:
        print("❌ No lessons found!")
        return
    print(f"📚 Testing with lesson: {lesson.title}")

    # 4. Simulate Lesson Completion (Unlock 'First Step' badge)
    print("\n--- Simulating Lesson Completion ---")
    
    # Ensure no previous progress
    LessonProgress.objects.filter(student=student, lesson=lesson).delete()
    PointTransaction.objects.filter(student=student).delete()
    StudentBadge.objects.filter(student=student).delete()
    
    progress, created = LessonProgress.objects.get_or_create(
        student=student,
        lesson=lesson,
        defaults={'completed': False}
    )
    
    # Mark as completed
    progress.completed = True
    progress.save() # Should trigger signal
    
    print("✅ Lesson marked as completed.")

    # 5. Verify Points
    points = PointTransaction.objects.filter(student=student, activity_type='lesson').count()
    if points > 0:
         print(f"✅ {points} PointTransaction(s) found for lesson activity.")
         total_xp = sum(pt.points for pt in PointTransaction.objects.filter(student=student))
         print(f"   Total XP: {total_xp}")
    else:
         print("❌ No points awarded!")

    # 6. Verify Badges
    badges = StudentBadge.objects.filter(student=student)
    if badges.exists():
        for sb in badges:
            print(f"🏆 Badge Earned: {sb.badge.name}")
            
        if badges.filter(badge__name='First Step').exists():
             print("✅ 'First Step' badge correctly awarded!")
        else:
             print("❌ 'First Step' badge NOT awarded.")
    else:
         print("❌ No badges earned.")

if __name__ == "__main__":
    run_verification()
