from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import AIInteractionLog, StudentAIReport, LearningPath, LearningNode
from .serializers import AIInteractionLogSerializer, StudentAIReportSerializer, LearningPathSerializer, LearningNodeSerializer
from academic.models import Student, Subject, Teacher, Result
from django.utils import timezone
from core.mixins import TenantScopedQuerysetMixin
from .services.tutor_service import AITutorService
from .services.personalization_service import PersonalizationService
from .services.predictive_service import PredictiveAnalyticsService
from .services.predictive_service import PredictiveAnalyticsService
from .services.reporting_service import ReportingService
from .services.schedule_service import ScheduleService
from .models import StudyEvent
from .serializers import StudyEventSerializer

class StudyEventViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Manage student study schedule.
    """
    queryset = StudyEvent.objects.all()
    serializer_class = StudyEventSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant'

    def get_queryset(self):
        qs = super().get_queryset()
        # If student, only see own
        if hasattr(self.request.user, 'student_profile'):
             qs = qs.filter(student=self.request.user.student_profile)
        return qs.order_by('start_time')

    @action(detail=False, methods=['post'])
    def generate(self, request):
        try:
            student = Student.objects.get(user=request.user)
            service = ScheduleService()
            events = service.generate_study_schedule(student)
            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
             return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AIInteractionLogViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing AI interaction logs.
    """
    queryset = AIInteractionLog.objects.all()
    serializer_class = AIInteractionLogSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant'

class StudentAIReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StudentAIReport.objects.all()
    serializer_class = StudentAIReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Allow simple filtering if needed (though TenantScoped handles tenant isolation ideally)
        # Assuming we might want to ensure tenant isolation manually if mixin not used here
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        return queryset

class LearningPathViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LearningPath.objects.all()
    serializer_class = LearningPathSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        # If student logs in, show their paths
        try:
            student = Student.objects.get(user=self.request.user)
            queryset = queryset.filter(student=student)
        except Student.DoesNotExist:
            pass # Admin sees all (filtered by tenant)
        
        return queryset

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate a learning path for a student/subject.
        In a real scenario, this would call an LLM.
        """
        student_id = request.data.get('student_id')
        subject_id = request.data.get('subject_id')
        topic_focus = request.data.get('topic_focus') # Optional keyword

        if not student_id:
            return Response({'error': 'Student ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = Student.objects.get(pk=student_id)
            tenant = student.user.tenant # Use student's user tenant
        except Student.DoesNotExist:
            # Try to get from logged in user if not provided or valid
            try:
                student = Student.objects.get(user=request.user)
                tenant = student.user.tenant
            except Student.DoesNotExist:
                return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        # Generate Title
        title = f"Path for {student.user.first_name}"
        if subject_id:
            try:
                subject = Subject.objects.get(pk=subject_id)
                title = f"{subject.name} Mastery Path"
            except Subject.DoesNotExist:
                subject = None
        else:
            subject = None

        if topic_focus:
            title += f": {topic_focus}"

        try:
            # Create Path
            path = LearningPath.objects.create(
                tenant=tenant,
                student=student,
                subject=subject,
                title=title,
                description=f"AI-generated personalized learning path based on recent performance."
            )

            # Mock Nodes Generation (simulating AI Logic)
            nodes_data = [
                {"title": "Foundational Concepts", "type": "article", "time": 10},
                {"title": f"Introduction to {topic_focus if topic_focus else 'Topic'}", "type": "video", "time": 15},
                {"title": "Practice Quiz: Basics", "type": "quiz", "time": 20},
                {"title": "Advanced Application", "type": "topic", "time": 30},
                {"title": "Mastery Challenge", "type": "assignment", "time": 45},
            ]

            for i, node in enumerate(nodes_data):
                LearningNode.objects.create(
                    learning_path=path,
                    title=node['title'],
                    order=i + 1,
                    resource_type=node['type'],
                    estimated_minutes=node['time'],
                    status='unlocked' if i == 0 else 'locked' # Unlock first node
                )

            serializer = self.get_serializer(path)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e), 'trace': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LearningNodeViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = LearningNode.objects.all()
    serializer_class = LearningNodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = 'learning_path__tenant'

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        node = self.get_object()
        node.status = 'completed'
        node.completed_at = timezone.now()
        node.save()

        # Unlock next node
        next_node = LearningNode.objects.filter(
            learning_path=node.learning_path,
            order__gt=node.order
        ).order_by('order').first()

        if next_node:
            next_node.status = 'unlocked' # Or 'in_progress'
            next_node.save()
        
        return Response({'status': 'completed', 'next_node_unlocked': next_node is not None})

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
