from django.db.models.signals import post_save
from django.dispatch import receiver
from academic.models import LessonProgress
from .models import PointTransaction, Badge, StudentBadge
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=LessonProgress)
def award_lesson_xp(sender, instance, created, **kwargs):
    if instance.completed:
        # 1. Award Points for Lesson Completion
        # Check if already awarded? 
        # Ideally we should trace this to avoid double counting if save called twice.
        # Simple check: if point transaction exists for this lesson activity within last minute? 
        # Better: LessonProgress should have 'points_awarded' flag. 
        #For now, let's assume 'completed' transition happens once. 
        
        # We need a robust way to avoid duplicates.
        # Let's check if points for THIS lesson exist.
        exists = PointTransaction.objects.filter(
            student=instance.student, 
            description__contains=f"Completed lesson: {instance.lesson.title}"
        ).exists()
        
        if not exists:
            # Award points
            points = 50 # Default
            logger.info(f"Awarding {points} XP to {instance.student} for lesson {instance.lesson.title}")
            PointTransaction.objects.create(
                tenant=instance.student.user.tenant, # Assuming access via user
                student=instance.student,
                points=points,
                description=f"Completed lesson: {instance.lesson.title}",
                activity_type='lesson'
            )
            
            check_badges(instance.student)
        else:
            logger.info(f"XP already awarded for lesson {instance.lesson.title} to {instance.student}")

def check_badges(student):
    tenant = student.user.tenant
    # Check 'lessons_completed' badge
    completed_count = LessonProgress.objects.filter(student=student, completed=True).count()
    logger.info(f"Checking badges for {student}: Completed {completed_count} lessons")
    
    # Find badges with criteria 'lessons_completed'
    potential_badges = Badge.objects.filter(tenant=tenant, criteria_type='lessons_completed')
    
    for badge in potential_badges:
        if completed_count >= badge.criteria_value:
            _, created = StudentBadge.objects.get_or_create(
                tenant=tenant,
                student=student,
                badge=badge
            )
            if created:
                logger.info(f"Unlocked badge: {badge.name} for {student}")
                # Award XP for Badge
                PointTransaction.objects.create(
                    tenant=tenant,
                    student=student,
                    points=badge.xp_reward,
                    description=f"Earned badge: {badge.name}",
                    activity_type='badge'
                )
