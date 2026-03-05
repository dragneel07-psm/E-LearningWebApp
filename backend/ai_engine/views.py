# Forced reload - V2
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import AIInteractionLog, StudentAIReport, LearningPath, LearningNode
from .serializers import AIInteractionLogSerializer, StudentAIReportSerializer, LearningPathSerializer, LearningNodeSerializer
from users.models import UserAccount
from academic.models import Student, Subject, Teacher, Result
from django.utils import timezone
from core.mixins import TenantScopedQuerysetMixin
from .services.tutor_service import AITutorService
from .services.personalization_service import PersonalizationService
from .services.learning_path_service import LearningPathService
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
        db_alias = getattr(request, 'db_alias', 'default')
        try:
            student = Student.objects.using(db_alias).get(user=request.user)
            service = ScheduleService()
            events = service.generate_study_schedule(student, using=db_alias)
            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
             return Response({'error': 'Student profile not found'}, status=404)
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
        Generate a learning path for a student based on recent performance.
        """
        student_id = request.data.get('student_id')
        subject_id = request.data.get('subject_id')
        
        db_alias = getattr(request, 'db_alias', 'default')

        try:
            if student_id:
                student = Student.objects.using(db_alias).get(pk=student_id)
            else:
                student = Student.objects.using(db_alias).get(user=request.user)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)

        subject = None
        if subject_id:
            try:
                subject = Subject.objects.using(db_alias).get(pk=subject_id)
            except Subject.DoesNotExist:
                pass

        try:
            service = LearningPathService()
            path = service.generate_path(student, subject)
            
            serializer = self.get_serializer(path)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get the current active learning path for the student.
        """
        db_alias = getattr(request, 'db_alias', 'default')
        try:
            student = Student.objects.using(db_alias).get(user=request.user)
            service = LearningPathService()
            path = service.get_active_path(student)
            
            if not path:
                return Response({'detail': 'No active path found'}, status=status.HTTP_404_NOT_FOUND)
                
            serializer = self.get_serializer(path)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        # Get tenant and DB alias from request
        db_alias = getattr(request, 'db_alias', 'default')
        
        # 1. Try Lookup by PK (Direct FK)
        teacher = Teacher.objects.using(db_alias).filter(user_id=request.user.pk).first()
        
        # 2. Fallback to Email lookup in Local DB
        if not teacher:
             try:
                 local_user = UserAccount.objects.using(db_alias).get(email=request.user.email)
                 teacher = Teacher.objects.using(db_alias).filter(user=local_user).first()
             except UserAccount.DoesNotExist:
                 pass
        
        if not teacher:
             return Response({
                 'error': 'Teacher profile not found in this tenant',
                 'debug': {
                     'user_id': str(request.user.pk),
                     'email': request.user.email,
                     'db_alias': db_alias
                 }
             }, status=404)

        class_ids = teacher.assigned_classes.using(db_alias).values_list('id', flat=True)
        
        service = PredictiveAnalyticsService()
        data = service.get_teacher_dashboard_data(list(class_ids), using=db_alias)
        return Response(data)
    except Teacher.DoesNotExist:
        return Response({'error': 'Teacher profile not found'}, status=404)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)

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
    # Frontend sends `conversation_history`; keep `history` as backward-compatible fallback.
    history = request.data.get('conversation_history')
    if history is None:
        history = request.data.get('history', [])
    if not isinstance(history, list):
        history = []
    
    if not message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        # Get tenant and DB alias from request (Middleware sets these)
        tenant = getattr(request, 'tenant', None)
        db_alias = getattr(request, 'db_alias', 'default')
        
        # Fallback to user's tenant if request.tenant is missing (some contexts)
        if not tenant and hasattr(request.user, 'tenant'):
            tenant = request.user.tenant

        context = {}
        try:
            # Explicitly use db_alias for all queries
            student = Student.objects.using(db_alias).get(user=request.user)
            
            # Identify weak topics from results - Explicit DB
            results = Result.objects.using(db_alias).filter(student=student).select_related('assessment', 'assessment__subject')
            weak_topics = []
            for res in results:
                try:
                    # Calculate percentage safely
                    if res.assessment.total_marks > 0:
                        if (res.score / res.assessment.total_marks) < 0.6:
                            weak_topics.append(res.assessment.subject.name)
                except:
                    continue
            
            # Deduplicate and limit
            weak_topics = list(set(weak_topics))[:3]
            
            # Get enrolled courses - Explicit DB on related manager
            courses = []
            if student.academic_class:
                courses = [s.name for s in student.academic_class.subjects.using(db_alias).all()]
            
            context = {
                'learning_style': student.learning_style,
                'ai_explanation_level': student.ai_explanation_level,
                'courses': courses,
                'weak_topics': weak_topics
            }
        except Exception as context_err:
            print(f"⚠️ Context gathering warning: {context_err}")
            # Non-fatal, proceed with empty context

        service = AITutorService()
        response_data = service.generate_tutor_response(
            message, 
            student_context=context, 
            conversation_history=history
        )
        response_text = response_data.get('response', '')
        tokens_used = int(response_data.get('tokens_used') or 0)
        is_demo = bool(response_data.get('is_demo', False))
        
        # Log interaction (simplified)
        if tenant:
            try:
                AIInteractionLog.objects.using(db_alias).create(
                    tenant=tenant,
                    user=request.user,
                    feature_used='tutor',
                    total_tokens=tokens_used
                )
            except Exception as log_err:
                print(f"⚠️ Interaction logging failed: {log_err}")
        
        return Response({
            'response': response_text,
            'tokens_used': tokens_used,
            'is_demo': is_demo,
            'error': response_data.get('error'),
            'fallback_reason': response_data.get('reason'),
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
