import os
import django
import sys
import uuid as uuid_lib

# Add the project root to the path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.db import connections, transaction
from django.contrib.auth import get_user_model
from core.models.tenant import Tenant
from core.middleware.tenant import _thread_locals
from django.core.management import call_command

User = get_user_model()

def setup_test_accounts():
    print("🚀 Starting Test Accounts Setup...")

    # 1. Ensure a Tenant exists in the DEFAULT database
    tenant, created = Tenant.objects.get_or_create(subdomain='demo')
    tenant.name = 'Demo School'
    tenant.db_name = 'school_demo.sqlite3'
    tenant.db_alias = 'demo_school'
    tenant.domain_url = 'localhost' # Allow local testing
    tenant.save()
    
    if created:
        print(f"✅ Created Tenant record: {tenant.name}")
    else:
        print(f"✅ Updated existing Tenant record: {tenant.name}")

    # 2. Add the tenant database to Django's connections dynamically
    if tenant.db_alias not in settings.DATABASES:
        new_db_config = settings.DATABASES['default'].copy()
        new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
        settings.DATABASES[tenant.db_alias] = new_db_config
        connections.databases[tenant.db_alias] = new_db_config
        print(f"✅ Registered dynamic database: {tenant.db_alias} -> {tenant.db_name}")

    # 3. Run migrations on the tenant database
    print(f"⏳ Running migrations on {tenant.db_alias}...")
    call_command('migrate', database=tenant.db_alias, interactive=False)
    print(f"✅ Migrations complete for {tenant.db_alias}")

    # 4. Set thread context to use the tenant database
    _thread_locals.tenant = tenant
    _thread_locals.db_alias = tenant.db_alias
    print(f"🔗 Set thread context to {tenant.db_alias}")

    # Re-import academic models AFTER setting context if needed
    from academic.models import Student, Teacher, AcademicClass, Section

    # 5. Helper to create user
    def create_account(username, email, password, role, is_superuser=False):
        user, created = User.objects.using('default').get_or_create(
            username=username,
            defaults={
                'email': email,
                'role': role,
                'tenant': tenant,
                'is_staff': is_superuser,
                'is_superuser': is_superuser
            }
        )
        user.set_password(password)
        user.save(using='default')
        
        # Ensure it exists in tenant DB 
        if tenant.db_alias != 'default':
            # Check if user exists in tenant DB
            existing_tenant_user = User.objects.using(tenant.db_alias).filter(username=username).first()
            
            if existing_tenant_user:
                # If IDs mismatch, delete and recreate
                if existing_tenant_user.user_id != user.user_id:
                    print(f"⚠️ User ID mismatch for {username}. Recreating in tenant DB...")
                    existing_tenant_user.delete(using=tenant.db_alias)
                    existing_tenant_user = None
            
            if not existing_tenant_user:
                user_tenant = User(
                    user_id=user.user_id, # Force same UUID
                    username=username,
                    email=email,
                    role=role,
                    tenant=tenant,
                    is_staff=is_superuser,
                    is_superuser=is_superuser
                )
                user_tenant.set_password(password)
                user_tenant.save(using=tenant.db_alias)
            else:
                # Update existing
                existing_tenant_user.email = email
                existing_tenant_user.role = role
                existing_tenant_user.is_staff = is_superuser
                existing_tenant_user.is_superuser = is_superuser
                existing_tenant_user.set_password(password)
                existing_tenant_user.save(using=tenant.db_alias)

        status = "Created" if created else "Updated"
        print(f"✅ {status} {role.capitalize()}: {username} / {password}")
        return user

    # SaaS Admin (Superuser)
    saas_admin = create_account('saas_admin', 'saas@demo.com', 'saas123', 'saas_admin', is_superuser=True)

    # School Admin (Admin role)
    school_admin = create_account('school_admin', 'admin@demo.com', 'admin123', 'admin')

    # Within the tenant database, create academic entities
    academic_class, _ = AcademicClass.objects.using(tenant.db_alias).get_or_create(
        name='Grade 10',
        defaults={'order': 10}
    )
    section, _ = Section.objects.using(tenant.db_alias).get_or_create(
        name='A',
        academic_class=academic_class,
        defaults={'capacity': 40}
    )
    print(f"✅ Setup Academic Class: {academic_class.name}")

    # Teacher
    teacher_user = create_account('teacher_test', 'teacher@demo.com', 'teacher123', 'teacher')
    teacher_profile, created = Teacher.objects.using(tenant.db_alias).get_or_create(user=teacher_user)
    if created:
        teacher_profile.designation = 'subject_teacher'
        teacher_profile.save(using=tenant.db_alias)
        print(f"   - Created Teacher Profile")

    # Student
    student_user = create_account('student_test', 'student@demo.com', 'student123', 'student')
    student_profile, created = Student.objects.using(tenant.db_alias).get_or_create(
        user=student_user,
        defaults={
            'academic_class': academic_class,
            'section': section
        }
    )
    if created:
        print(f"   - Created Student Profile (Grade 10-A)")

    print("\n🎉 Test accounts setup complete!")
    print("-" * 30)
    print(f"SaaS Admin:   saas_admin / saas123")
    print(f"School Admin: school_admin / admin123")
    print(f"Teacher:      teacher_test / teacher123")
    print(f"Student:      student_test / student123")
    print("-" * 30)

if __name__ == '__main__':
    setup_test_accounts()
