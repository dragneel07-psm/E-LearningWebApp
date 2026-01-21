from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from academic.models import Student, Teacher, Result
from .services.tutor_service import AITutorService
from .services.personalization_service import PersonalizationService
from .services.predictive_service import PredictiveAnalyticsService
from .services.reporting_service import ReportingService
from .models import AIInteractionLog, StudentAIReport
from .serializers import AIInteractionLogSerializer
from core.mixins import TenantScopedQuerysetMixin

class AIInteractionLogViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing AI interaction logs.
    """
    queryset = AIInteractionLog.objects.all()
    serializer_class = AIInteractionLogSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_analytics(request):
    """
    Teacher-facing predictive analytics.
    """
    try:
        # Check if user is a teacher
        teacher = Teacher.objects.get(user=request.user)
        class_ids = teacher.assigned_classes.values_list('id', flat=True)
        
        service = PredictiveAnalyticsService()
        data = service.get_teacher_dashboard_data(list(class_ids))
        return Response(data)
    except Teacher.DoesNotExist:
        return Response({'error': 'Teacher profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_report(request, student_id):
    """
    Generate a detailed AI report for a student.
    """
    try:
        service = ReportingService()
        data = service.generate_student_report(student_id)
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_past_reports(request, student_id):
    """
    Get past AI reports for a student.
    """
    try:
        reports = StudentAIReport.objects.filter(student_id=student_id).order_by('-generated_at')
        data = [{
            'report_id': r.report_id,
            'report_data': r.report_data,
            'generated_at': r.generated_at,
            'is_automated': r.is_automated
        } for r in reports]
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_recommendations(request):
    """
    Get personalized study recommendations for the current student.
    """
    try:
        student = Student.objects.get(user=request.user)
        service = PersonalizationService()
        data = service.get_student_recommendations(student.student_id)
        return Response(data)
    except Student.DoesNotExist:
        return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_tutor_chat(request):
    """
    Handle AI tutor chat messages with context awareness.
    """
    message = request.data.get('message')
    history = request.data.get('history', [])
    
    if not message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Get student context for personalization
        student = Student.objects.get(user=request.user)
        
        # Identify weak topics from results
        results = Result.objects.filter(student=student).select_related('assessment', 'assessment__subject')
        weak_topics = []
        for res in results:
            if (res.score / res.assessment.total_marks) < 0.6:
                weak_topics.append(res.assessment.subject.name)
        
        # Deduplicate and limit
        weak_topics = list(set(weak_topics))[:3]
        
        # Get enrolled courses
        # Note: In this project subjects are linked to Class. 
        # Students belong to a Class. So courses are subjects of their class.
        courses = [s.name for s in student.academic_class.subjects.all()] if student.academic_class else []
        
        context = {
            'learning_style': student.learning_style,
            'ai_explanation_level': student.ai_explanation_level,
            'courses': courses,
            'weak_topics': weak_topics
        }
        
        service = AITutorService()
        response_text = service.get_chat_response(history + [{"role": "user", "content": message}], context)
        
        # Log interaction (simplified)
        AIInteractionLog.objects.create(
            tenant=request.user.tenant,
            user=request.user,
            feature_used='tutor',
            total_tokens=len(message) // 4 + len(response_text) // 4 # Very rough estimation
        )
        
        return Response({'response': response_text})
        
    except Student.DoesNotExist:
        # Fallback for non-student users (e.g. teachers/admins)
        service = AITutorService()
        response_text = service.get_chat_response(history + [{"role": "user", "content": message}])
        return Response({'response': response_text})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
