from .models import Badge, StudentBadge, PointTransaction
from academic.models import Student, LessonProgress, Result
from django.db.models import Count
from django.utils import timezone

class GamificationService:
    @staticmethod
    def award_points(student, points, description, activity_type):
        """
        Record a point transaction for a student.
        """
        tenant = student.user.tenant
        PointTransaction.objects.create(
            tenant=tenant,
            student=student,
            points=points,
            description=description,
            activity_type=activity_type
        )
        return True

    @staticmethod
    def check_badges(student):
        """
        Check and award badges based on student progress.
        """
        tenant = student.user.tenant
        available_badges = Badge.objects.filter(tenant=tenant)
        earned_badge_ids = set(StudentBadge.objects.filter(student=student).values_list('badge_id', flat=True))
        
        new_badges = []
        
        for badge in available_badges:
            if badge.id in earned_badge_ids:
                continue
            
            should_award = False
            
            if badge.criteria_type == 'lessons_completed':
                completed_count = LessonProgress.objects.filter(student=student, completed=True).count()
                if completed_count >= badge.criteria_value:
                    should_award = True
            
            elif badge.criteria_type == 'streak_days':
                if student.current_streak >= badge.criteria_value:
                    should_award = True
            
            elif badge.criteria_type == 'perfect_score':
                perfect_exists = Result.objects.filter(
                    student=student, 
                    score=F('assessment__total_marks')
                ).exists()
                if perfect_exists:
                    should_award = True

            if should_award:
                sb = StudentBadge.objects.create(
                    tenant=tenant,
                    student=student,
                    badge=badge
                )
                new_badges.append(sb)
                # Award XP reward for badge
                GamificationService.award_points(
                    student, 
                    badge.xp_reward, 
                    f"Earned Badge: {badge.name}", 
                    'badge'
                )
        
        return new_badges

    @staticmethod
    def on_lesson_complete(student, lesson):
        """
        Called when a lesson is marked completed.
        """
        # 1. Award base XP for lesson
        GamificationService.award_points(
            student, 
            20, 
            f"Completed lesson: {lesson.title}", 
            'lesson'
        )
        
        # 2. Update Minutes Learned (optional, already in student model?)
        # 3. Check for new badges
        return GamificationService.check_badges(student)

    @staticmethod
    def on_assessment_complete(student, result):
        """
        Called when an assessment is submitted/graded.
        """
        # Award points based on percentage
        percentage = (result.score / result.assessment.total_marks) * 100
        points = int(percentage * 0.5) # e.g. 100% -> 50 points
        
        GamificationService.award_points(
            student, 
            points, 
            f"Completed {result.assessment.type}: {result.assessment.title}", 
            'assessment'
        )
        
        return GamificationService.check_badges(student)
