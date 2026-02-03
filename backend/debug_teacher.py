
import os
import django
import sys

# Add the project root to the path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from academic.models import Teacher, Student, AcademicClass
from core.models.tenant import Tenant

def debug_teacher():
    tenant = Tenant.objects.get(subdomain='demo')
    db_alias = tenant.db_alias
    
    print(f"Tenant: {tenant.name}, DB Alias: {db_alias}")
    
    teacher = Teacher.objects.using(db_alias).get(user__username='teacher_test')
    classes = teacher.assigned_classes.using(db_alias).all()
    
    print(f"Teacher: {teacher.user.get_full_name()} ({teacher.user.username})")
    print(f"Assigned Classes: {[c.name for c in classes]}")
    
    for c in classes:
        students = Student.objects.using(db_alias).filter(academic_class=c)
        print(f"Class: {c.name}, Students: {students.count()}")
        for s in students:
            print(f" - {s.user.get_full_name()} ({s.student_id})")

if __name__ == '__main__':
    debug_teacher()
