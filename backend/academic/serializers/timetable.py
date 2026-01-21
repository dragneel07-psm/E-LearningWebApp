from rest_framework import serializers
from ..models.timetable import Timetable

class TimetableSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.get_full_name', read_only=True)
    academic_class_name = serializers.CharField(source='academic_class.name', read_only=True)
    
    id = serializers.IntegerField(source='timetable_id', read_only=True)
    
    class Meta:
        model = Timetable
        fields = ['id', 'timetable_id', 'academic_class', 'academic_class_name', 'day_of_week', 
                  'start_time', 'end_time', 'subject_name', 'teacher', 'teacher_name', 'room_number']
