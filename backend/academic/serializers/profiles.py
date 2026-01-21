from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from ..models import Teacher, Student, Parent, AcademicClass, Section, Subject

User = get_user_model()

class TeacherSerializer(serializers.ModelSerializer):
    # UUID PK
    id = serializers.UUIDField(source='teacher_id', read_only=True)
    
    # Read-only fields from User
    user_id = serializers.UUIDField(source='user.user_id', read_only=True)
    email = serializers.EmailField(source='user.email')
    username = serializers.CharField(source='user.username', required=False)
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Teacher
        fields = [
            'id', 'user_id', 'email', 'username', 'first_name', 'last_name',
            'password', 'assigned_classes', 'is_active', 'designation'
        ]

    def create(self, validated_data):
        user_data = validated_data.pop('user', {})
        email = user_data.get('email')
        username = user_data.get('username', email.split('@')[0])
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')
        password = validated_data.pop('password', 'Teacher@123')
        
        assigned_classes = validated_data.pop('assigned_classes', [])

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                username=username,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role='teacher'
            )
            
            teacher = Teacher.objects.create(user=user, **validated_data)
            if assigned_classes:
                teacher.assigned_classes.set(assigned_classes)
            
            return teacher

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user
        
        if 'email' in user_data: user.email = user_data['email']
        if 'first_name' in user_data: user.first_name = user_data['first_name']
        if 'last_name' in user_data: user.last_name = user_data['last_name']
        if user_data: user.save()

        if 'assigned_classes' in validated_data:
            instance.assigned_classes.set(validated_data['assigned_classes'])

        return super().update(instance, validated_data)


# --- Student Serializers ---

class StudentUserSerializer(serializers.ModelSerializer):
    """Serializer for the User part of a Student"""
    class Meta:
        model = User
        fields = ['user_id', 'username', 'email', 'first_name', 'last_name', 'phone_number', 'date_of_birth']
        read_only_fields = ['user_id']


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing students"""
    user = StudentUserSerializer(read_only=True)
    class_name = serializers.CharField(source='academic_class.name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    student_id = serializers.UUIDField(read_only=True) # Explicitly include student_id
    
    # Flatten user fields for easier frontend consumption
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    attendance_percentage = serializers.SerializerMethodField()
    recent_grades = serializers.SerializerMethodField()
    upcoming_assessments = serializers.SerializerMethodField()
    
    id = serializers.UUIDField(source='student_id', read_only=True)
    
    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'user', 'first_name', 'last_name', 'email',
            'academic_class', 'class_name', 
            'section', 'section_name', 'current_streak', 'focus_score',
            'attendance_percentage', 'recent_grades', 'upcoming_assessments'
        ]

    def get_attendance_percentage(self, obj):
        from academic.models import Attendance
        from django.utils import timezone
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        records = Attendance.objects.filter(student=obj, date__gte=thirty_days_ago)
        if not records.exists():
            return 100 # Default if no records
        present = records.filter(status='present').count()
        return round((present / records.count()) * 100)

    def get_recent_grades(self, obj):
        from academic.models import Result
        results = Result.objects.filter(student=obj).select_related('assessment', 'assessment__subject').order_by('-submitted_at')[:3]
        return [{
            'assessment_title': r.assessment.title,
            'subject': r.assessment.subject.name,
            'score': r.score,
            'total_marks': r.assessment.total_marks,
            'percentage': round((r.score / r.assessment.total_marks) * 100, 1),
            'date': r.submitted_at.date()
        } for r in results]

    def get_upcoming_assessments(self, obj):
        from academic.models import Assessment
        from django.utils import timezone
        upcoming = Assessment.objects.filter(
            subject__academic_class=obj.academic_class,
            scheduled_at__gte=timezone.now()
        ).order_by('scheduled_at')[:2]
        return [{
            'title': a.title,
            'subject': a.subject.name,
            'date': a.scheduled_at,
            'type': a.type
        } for a in upcoming]


class StudentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for student profile"""
    user = StudentUserSerializer(read_only=True)
    id = serializers.UUIDField(source='student_id', read_only=True)
    
    class Meta:
        model = Student
        fields = '__all__'


class StudentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new student with user account"""
    # User fields
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(write_only=True, required=False, allow_null=True)
    
    # Include user in response
    user = StudentUserSerializer(read_only=True)
    
    id = serializers.UUIDField(source='student_id', read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'student_id', 'email', 'password', 'first_name', 'last_name',
            'phone_number', 'date_of_birth', 'academic_class', 'section',
            'learning_style', 'daily_study_goal', 'ai_explanation_level',
            'language_preference', 'user'
        ]
        read_only_fields = ['id', 'student_id']
    
    def validate_email(self, value):
        """Ensure email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate(self, data):
        """Ensure section belongs to the selected class"""
        if data.get('section') and data.get('academic_class'):
            if data['section'].academic_class != data['academic_class']:
                raise serializers.ValidationError({
                    'section': 'This section does not belong to the selected class.'
                })
        return data
    
    def create(self, validated_data):
        """Create both User and Student in a transaction"""
        
        # Extract user fields
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        phone_number = validated_data.pop('phone_number', '')
        date_of_birth = validated_data.pop('date_of_birth', None)
        
        with transaction.atomic():
            # Generate username from email
            username = email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            # Create user account
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                date_of_birth=date_of_birth,
                role='student'
            )
            
            # Create student profile
            student = Student.objects.create(user=user, **validated_data)
            
        return student


class StudentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating student profile (excluding user creation)"""
    
    class Meta:
        model = Student
        fields = [
            'academic_class', 'section', 'learning_style', 'daily_study_goal',
            'ai_explanation_level', 'language_preference', 'current_streak',
            'total_minutes_learned', 'focus_score'
        ]
    
    def validate(self, data):
        """Ensure section belongs to the selected class"""
        instance = self.instance
        academic_class = data.get('academic_class', instance.academic_class)
        section = data.get('section', instance.section)
        
        if section and academic_class:
            if section.academic_class != academic_class:
                raise serializers.ValidationError({
                    'section': 'This section does not belong to the selected class.'
                })
        return data

class ParentSerializer(serializers.ModelSerializer):
    user = StudentUserSerializer(read_only=True)
    students = StudentListSerializer(many=True, read_only=True)
    id = serializers.UUIDField(source='parent_id', read_only=True)
    
    class Meta:
        model = Parent
        fields = ['id', 'parent_id', 'user', 'students']
