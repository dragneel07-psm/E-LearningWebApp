from django.utils import timezone
from typing import Optional, List
from academic.models import Student, Subject, Lesson, Result, LessonProgress
from ai_engine.models import LearningPath, LearningNode

class LearningPathService:
    def generate_path(self, student: Student, subject: Optional[Subject] = None) -> LearningPath:
        """
        Generate a learning path for a student based on recent performance.
        """
        tenant = student.user.tenant
        db_alias = getattr(student, '_state', None).db if hasattr(student, '_state') else 'default'
        
        # Generate Title
        current_date = timezone.now().date()
        if subject:
            title = f"{subject.name} Mastery Path - {current_date}"
        else:
            title = f"Personalized Learning Path - {current_date}"

        # Create the Path
        path = LearningPath.objects.using(db_alias).create(
            tenant=tenant,
            student=student,
            subject=subject,
            title=title,
            description="AI-generated personalized learning path based on recent performance and curriculum."
        )

        nodes_created = 0

        # Strategy 1: Remedial (Focus on weak areas)
        # Find assessments where score < 70%
        result_filter = {'student': student, 'score__lt': 70}
        if subject:
            result_filter['assessment__subject'] = subject
        
        weak_results = Result.objects.using(db_alias).filter(**result_filter).select_related('assessment').order_by('-submitted_at')[:3]
        
        for res in weak_results:
            assessment = res.assessment
            LearningNode.objects.using(db_alias).create(
                learning_path=path,
                title=f"Review: {assessment.title}",
                description=f"Your recent score of {res.score}% indicates room for improvement. Focus on the core concepts of this assessment.",
                resource_type='topic',
                order=nodes_created + 1,
                status='unlocked' if nodes_created == 0 else 'locked',
                estimated_minutes=30
            )
            nodes_created += 1

        # Strategy 2: Next Steps (Curriculum Progression)
        # Find lessons that haven't been completed yet
        lesson_filter = {'is_published': True}
        if subject:
            lesson_filter['chapter__subject'] = subject
        elif student.academic_class:
            lesson_filter['chapter__subject__academic_class'] = student.academic_class

        # Get lessons in order
        all_lessons = Lesson.objects.using(db_alias).filter(**lesson_filter).order_by('chapter__order', 'order')
        
        # Filter out completed lessons
        completed_lesson_ids = LessonProgress.objects.using(db_alias).filter(
            student=student, 
            completed=True
        ).values_list('lesson_id', flat=True)
        
        next_lessons = all_lessons.exclude(id__in=completed_lesson_ids)[:3]

        for lesson in next_lessons:
            LearningNode.objects.using(db_alias).create(
                learning_path=path,
                title=f"Learn: {lesson.title}",
                description=f"Next recommended step in your {lesson.chapter.subject.name} curriculum.",
                resource_type='video',
                lesson=lesson,
                order=nodes_created + 1,
                status='unlocked' if nodes_created == 0 else 'locked',
                estimated_minutes=lesson.duration_minutes
            )
            nodes_created += 1

        return path

    def get_active_path(self, student: Student, subject: Optional[Subject] = None) -> Optional[LearningPath]:
        """
        Retrieve the most recent active path for a student.
        """
        db_alias = getattr(student, '_state', None).db if hasattr(student, '_state') else 'default'
        query = LearningPath.objects.using(db_alias).filter(student=student, is_active=True)
        if subject:
            query = query.filter(subject=subject)
        
        return query.order_by('-created_at').first()
