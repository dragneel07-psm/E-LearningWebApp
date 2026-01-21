from rest_framework import serializers
from ..models.communications import Notice

class NoticeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notice
        fields = ['id', 'tenant', 'title', 'content', 'target_audience', 'target_student', 'target_class', 'created_at']
