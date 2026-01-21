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

    class Meta:
        model = Subject
        fields = '__all__'

class AcademicClassSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = AcademicClass
        fields = ['id', 'name', 'order', 'sections', 'subjects', 'created_at']

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['attendance_id', 'student', 'student_name', 'subject', 'subject_name', 'date', 'status', 'remarks', 'created_at']
