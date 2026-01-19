from rest_framework import serializers
from academic.models import Attendance, Timetable, Notice, Result, Assessment

class AttendanceSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.subject', read_only=True)
    
    class Meta:
        model = Attendance
        fields = '__all__'

class TimetableSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Timetable
        fields = '__all__'
        
    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.user.first_name} {obj.teacher.user.last_name}"
        return "TBA"

class NoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notice
        fields = '__all__'

class ResultSerializer(serializers.ModelSerializer):
    assessment_title = serializers.CharField(source='assessment.title', read_only=True)
    assessment_type = serializers.CharField(source='assessment.type', read_only=True)
    total_marks = serializers.IntegerField(source='assessment.total_marks', read_only=True)
    
    class Meta:
        model = Result
        fields = '__all__'
