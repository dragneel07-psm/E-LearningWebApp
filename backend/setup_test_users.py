import os
import django
import sys

# Add the project root to the path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import UserAccount

def create_test_user(username, password, role):
    try:
        user = UserAccount.objects.get(username=username)
        user.set_password(password)
        user.role = role
        user.save()
        print(f"Updated user: {username} with role {role}")
    except UserAccount.DoesNotExist:
        UserAccount.objects.create_user(username=username, password=password, role=role)
        print(f"Created user: {username} with role {role}")

if __name__ == '__main__':
    create_test_user('student', 'student', 'student')
    create_test_user('teacher', 'teacher', 'teacher')
    create_test_user('admin', 'admin', 'admin')
