from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from academic.models import Student
from .services.tutor_service import ai_tutor_service
from .models import AIInteractionLog
from .serializers import AIInteractionLogSerializer
from core.mixins import TenantScopedQuerysetMixin

# ViewSet for AIInteractionLog
class AIInteractionLogViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = AIInteractionLog.objects.all()
    serializer_class = AIInteractionLogSerializer

# AI Tutor Chat Endpoint
@api_view(['POST'])
def ai_tutor_chat(request):
    """
    Handle AI tutor chat messages
    
    Request body:
    {
        "message": "string",
        "student_id": "uuid",
        "conversation_history": [{"role": "user|assistant", "content": "..."}]
    }
    """
    try:
        message = request.data.get('message')
        student_id = request.data.get('student_id')
        conversation_history = request.data.get('conversation_history', [])
        
        print(f"DEBUG: AI Chat Request - message='{message}', student_id='{student_id}', history_len={len(conversation_history)}")

        if not message or not student_id:
            print(f"DEBUG: Missing fields! message={bool(message)}, student_id={bool(student_id)}")
            return Response(
                {'error': 'message and student_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get student for context
        student = get_object_or_404(Student, student_id=student_id)
        
        # Build student context
        student_context = {
            'student_id': str(student_id),
            'courses': [],  # TODO: fetch from student's enrolled courses
            'weak_topics': [],  # TODO: analyze from recent results
            'learning_style': getattr(student, 'learning_style', 'visual'),
            'ai_explanation_level': getattr(student, 'ai_explanation_level', 'normal'),
            'daily_goal': getattr(student, 'daily_study_goal', 30)
        }
        
        # Generate AI response
        result = ai_tutor_service.generate_tutor_response(
            message=message,
            student_context=student_context,
            conversation_history=conversation_history
        )
        
        # Log interaction if not demo
        if not result.get('is_demo'):
            try:
                AIInteractionLog.objects.create(
                    tenant=student.user.tenant,
                    user=student.user,
                    feature_used='tutor',
                    total_tokens=result.get('tokens_used', 0),
                    prompt_tokens=0,
                    completion_tokens=result.get('tokens_used', 0)
                )
            except Exception as log_error:
                print(f"Failed to log AI interaction: {log_error}")
        
        return Response({
            'response': result['response'],
            'tokens_used': result.get('tokens_used', 0),
            'is_demo': result.get('is_demo', False)
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
