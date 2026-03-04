from rest_framework import serializers
from ..models import AcademicYear, AcademicClass, Section, Subject, Attendance

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'

class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'

class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.username', read_only=True)
    additional_teacher_names = serializers.SerializerMethodField()
    total_lessons = serializers.SerializerMethodField()
    completed_lessons = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = '__all__'

    def get_total_lessons(self, obj):
        from ..models.lesson import Lesson
        return Lesson.objects.filter(chapter__subject=obj).count()

    def get_additional_teacher_names(self, obj):
        names = []
        for teacher in obj.additional_teachers.all():
            full_name = f"{teacher.user.first_name} {teacher.user.last_name}".strip()
            names.append(full_name or teacher.user.username)
        return names

    def get_completed_lessons(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
            
        from ..models.lesson import Lesson, LessonProgress
        from ..models.student import Student
        
        try:
            student = Student.objects.get(user=request.user)
            return LessonProgress.objects.filter(
                student=student, 
                lesson__chapter__subject=obj, 
                completed=True
            ).count()
        except Student.DoesNotExist:
            # For teachers/admins, maybe return average completion later
            return 0

    def get_progress_percentage(self, obj):
        total = self.get_total_lessons(obj)
        if total == 0:
            return 0
        completed = self.get_completed_lessons(obj)
        return round((completed / total) * 100)

class AcademicClassSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = AcademicClass
        fields = ['id', 'name', 'order', 'sections', 'subjects', 'created_at']

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    id = serializers.IntegerField(source='attendance_id', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['id', 'attendance_id', 'student', 'student_name', 'subject', 'subject_name', 'date', 'status', 'remarks', 'created_at']
