from rest_framework import serializers
from .models import Badge, StudentBadge, PointTransaction
from academic.models import Student

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = '__all__'

class StudentBadgeSerializer(serializers.ModelSerializer):
    badge_details = BadgeSerializer(source='badge', read_only=True)
    
    class Meta:
        model = StudentBadge
        fields = ['id', 'badge', 'badge_details', 'earned_at']

class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = '__all__'

class LeaderboardEntrySerializer(serializers.Serializer):
    student_id = serializers.UUIDField(source='student_id')
    student_name = serializers.CharField()
    total_points = serializers.IntegerField()
    badges_count = serializers.IntegerField()
    rank = serializers.IntegerField()
