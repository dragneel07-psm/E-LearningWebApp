from rest_framework import serializers
from ..models import AcademicClass, Student, Teacher, Parent, Course, Lesson, Assessment, Result, Submission, Question
from .student_portal import AttendanceSerializer, TimetableSerializer, NoticeSerializer, ResultSerializer as SPResultSerializer

class AcademicClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicClass
        fields = '__all__'
        read_only_fields = ['tenant', 'class_id']

class StudentSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'

class TeacherSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    
    assigned_classes = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AcademicClass.objects.all(),
        required=False
    )

    class Meta:
        model = Teacher
        fields = '__all__'

    def create(self, validated_data):
        assigned_classes = validated_data.pop('assigned_classes', [])
        teacher = Teacher.objects.create(**validated_data)
        if assigned_classes:
            teacher.assigned_classes.set(assigned_classes)
        return teacher

    def update(self, instance, validated_data):
        assigned_classes = validated_data.pop('assigned_classes', None)
        instance = super().update(instance, validated_data)
        if assigned_classes is not None:
            instance.assigned_classes.set(assigned_classes)
        return instance

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Ensure assigned_classes is explicitly just a list of IDs for the frontend
        # Although PrimaryKeyRelatedField handles this, this is a double-check
        representation['assigned_classes'] = [str(c.class_id) for c in instance.assigned_classes.all()]
        return representation

class ParentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parent
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = '__all__'

class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = '__all__'

class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Result
        fields = '__all__'

class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = '__all__'

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'
