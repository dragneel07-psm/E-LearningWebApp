from .models import Notification
from django.conf import settings

class NotificationService:
    @staticmethod
    def create_notification(recipient, title, message, tenant=None, link=None):
        """
        Creates a notification for a user.
        If tenant is not provided, it tries to get it from the recipient's profile or user object.
        """
        if not tenant:
            tenant = getattr(recipient, 'tenant', None)
        
        notification = Notification.objects.create(
            tenant=tenant,
            recipient=recipient,
            title=title,
            message=message,
            link=link
        )
        return notification

    @staticmethod
    def notify_role(tenant, role, title, message, link=None):
        """
        Sends a notification to all users with a specific role within a tenant.
        """
        from users.models import UserAccount
        users = UserAccount.objects.filter(tenant=tenant, role=role)
        notifications = []
        for user in users:
            notifications.append(
                NotificationService.create_notification(user, title, message, tenant=tenant, link=link)
            )
        return notifications

    @staticmethod
    def notify_class(tenant, academic_class, title, message, link=None):
        """
        Sends a notification to all students in a specific class.
        """
        from academic.models import Student
        students = Student.objects.filter(academic_class=academic_class, user__tenant=tenant)
        notifications = []
        for student in students:
            notifications.append(
                NotificationService.create_notification(student.user, title, message, tenant=tenant, link=link)
            )
        return notifications
