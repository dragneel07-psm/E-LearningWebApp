from rest_framework import serializers
from academic.models.lesson import Chapter, Lesson, LessonMaterial, LessonProgress

class LessonMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonMaterial
        fields = ['id', 'lesson', 'title', 'file', 'link', 'material_type', 'created_at']

class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ['id', 'student', 'lesson', 'completed', 'last_accessed', 'completed_at']

class LessonSummarySerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = ['id', 'chapter', 'title', 'content_type', 'order', 'is_published', 'duration_minutes', 'updated_at', 'completed']

    def get_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                # Optimized lookup
                from academic.models.student import Student
                from academic.models.lesson import LessonProgress
                
                # Try to get student from user relation first if available
                # Or query filtering by user (safer than get() in multi-tenant if oddities exist)
                student = None
                if hasattr(request.user, 'student_profile'):
                    student = request.user.student_profile
                
                if not student:
                    student = Student.objects.filter(user=request.user).first()
                
                if student:
                    return LessonProgress.objects.filter(student=student, lesson=obj, completed=True).exists()
            except Exception:
                return False
        return False

class LessonDetailSerializer(serializers.ModelSerializer):
    materials = LessonMaterialSerializer(many=True, read_only=True)
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'chapter', 'title', 'content_type', 'content', 'video_url', 
            'interactive_data', 'assessment',
            'order', 'is_published', 'duration_minutes', 'materials', 
            'user_progress', 'created_at', 'updated_at'
        ]

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                from academic.models.student import Student
                student = Student.objects.get(user=request.user)
                progress, _ = LessonProgress.objects.get_or_create(student=student, lesson=obj)
                return LessonProgressSerializer(progress).data
            except Student.DoesNotExist:
                return None
        return None

class ChapterSerializer(serializers.ModelSerializer):
    lessons = LessonSummarySerializer(many=True, read_only=True)

    class Meta:
        model = Chapter
        fields = ['id', 'subject', 'title', 'description', 'order', 'lessons', 'created_at']
