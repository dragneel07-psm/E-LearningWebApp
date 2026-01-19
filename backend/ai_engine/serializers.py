from rest_framework import serializers
from .models import AIInteractionLog

class AIInteractionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInteractionLog
        fields = '__all__'
