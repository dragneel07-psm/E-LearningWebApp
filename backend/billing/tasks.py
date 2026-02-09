from datetime import date
from notifications.services import NotificationService
from .models import StudentFee

def check_overdue_fees():
    """
    Checks for overdue fees and sends reminders to students/parents.
    """
    today = date.today()
    overdue_fees = StudentFee.objects.filter(due_date__lt=today, status__in=['pending', 'partial'])
    
    count = 0
    for fee in overdue_fees:
        # Avoid spamming: Check if notification already sent recently? 
        # For MVP, we'll just send. In prod, we'd log 'last_reminded_at'.
        
        student = fee.student
        tenant = fee.tenant

        title = f"Overdue Fee Reminder: {fee.fee_structure.name}"
        message = f"Dear {student.first_name}, your fee of {fee.amount_due} was due on {fee.due_date}. Please pay immediately."
        
        # Send In-App + Email
        NotificationService.create_notification(
            recipient=student.user, 
            title=title, 
            message=message, 
            tenant=tenant,
            channels=['email', 'app']
        )
        
        # Notify Parent if exists
        # if hasattr(student, 'parent_profile'): ...
        
        count += 1
        
    return f"Sent {count} fee reminders."
