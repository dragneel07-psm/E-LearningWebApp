from rest_framework import serializers
from .models import AIInteractionLog, StudentAIReport, LearningPath, LearningNode

class AIInteractionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInteractionLog
        fields = '__all__'

class StudentAIReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAIReport
        fields = '__all__'

class LearningNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningNode
        fields = '__all__'
        read_only_fields = ['id', 'learning_path']

class LearningPathSerializer(serializers.ModelSerializer):
    nodes = LearningNodeSerializer(many=True, read_only=True)
    
    class Meta:
        model = LearningPath
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
