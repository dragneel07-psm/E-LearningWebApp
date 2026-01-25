from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from academic.models.lesson import Chapter, Lesson, LessonMaterial
from academic.serializers.lesson import (
    ChapterSerializer, 
    LessonDetailSerializer, 
    LessonSummarySerializer,
    LessonMaterialSerializer
)

class ChapterViewSet(viewsets.ModelViewSet):
    queryset = Chapter.objects.all()
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        return queryset.order_by('order')

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder chapters. Expects { orders: [ { id: 1, order: 1 }, ... ] }
        """
        orders = request.data.get('orders', [])
        for item in orders:
            try:
                chapter = Chapter.objects.get(id=item['id'])
                chapter.order = item['order']
                chapter.save()
            except Chapter.DoesNotExist:
                continue
        return Response({'status': 'reordered'})

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return LessonSummarySerializer
        return LessonDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chapter_id = self.request.query_params.get('chapter')
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(chapter__subject_id=subject_id)
            
        return queryset.order_by('chapter__order', 'order')
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder lessons. Expects { orders: [ { id: 1, order: 1 }, ... ] }
        """
        orders = request.data.get('orders', [])
        for item in orders:
            try:
                from academic.models.lesson import Lesson
                lesson = Lesson.objects.get(id=item['id'])
                lesson.order = item['order']
                lesson.save()
            except Lesson.DoesNotExist:
                continue
        return Response({'status': 'reordered'})

    @action(detail=True, methods=['post'])
    def toggle_progress(self, request, pk=None):
        """
        Toggle completion status for the current student.
        """
        lesson = self.get_object()
        from academic.models.student import Student
        from academic.models.lesson import LessonProgress
        from django.utils import timezone
        
        try:
            student = Student.objects.get(user=request.user)
            progress, created = LessonProgress.objects.get_or_create(student=student, lesson=lesson)
            
            # Toggle logic
            progress.completed = not progress.completed
            if progress.completed:
                progress.completed_at = timezone.now()
            else:
                progress.completed_at = None
            
            progress.save()
            
            # Award gamification rewards if completed
            if progress.completed:
                try:
                    from gamification.services.gamification_service import GamificationService
                    GamificationService.on_lesson_complete(student, lesson)
                except ImportError:
                    pass # App might not be fully ready in all environments

            return Response({'completed': progress.completed})
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

class LessonMaterialViewSet(viewsets.ModelViewSet):
    queryset = LessonMaterial.objects.all()
    serializer_class = LessonMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        lesson_id = self.request.query_params.get('lesson')
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        return queryset
