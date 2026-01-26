# Forced reload - V2
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
        Generate a learning path for a student based on recent performance.
        """
        student_id = request.data.get('student_id')
        subject_id = request.data.get('subject_id')
        
        if not student_id:
             # Auto-detect if student user
            if hasattr(request.user, 'role') and request.user.role == 'student':
                 try:
                    student = Student.objects.get(user=request.user)
                    student_id = student.id
                 except:
                    return Response({'error': 'Student profile not found'}, status=400)
            else:
                 return Response({'error': 'student_id is required'}, status=400)

        try:
            student = Student.objects.get(pk=student_id)
            tenant = student.user.tenant
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)

        # Generate Title
        title = f"Path for {student.user.first_name} - {timezone.now().date()}"
        subject = None
        if subject_id:
            try:
                subject = Subject.objects.get(pk=subject_id)
                title = f"{subject.name} Mastery Path"
            except Subject.DoesNotExist:
                pass

        try:
            # Create Path
            path = LearningPath.objects.create(
                tenant=tenant,
                student=student,
                subject=subject,
                title=title,
                description="AI-generated personalized learning path based on recent performance."
            )
            
            nodes_created = 0
            
            # Strategy A: Remedial (Low Scores)
            # Find assessments with score < 70%
            subject_filter = {}
            if subject_id:
                subject_filter['assessment__subject_id'] = subject_id

            low_results = Result.objects.filter(
                student=student, 
                score__lt=70,
                **subject_filter
            ).select_related('assessment').order_by('-submitted_at')[:3]
            
            for res in low_results:
                assessment = res.assessment
                LearningNode.objects.create(
                    learning_path=path,
                    title=f"Review: {assessment.title}",
                    description=f"Score: {res.score}%. Recommended review.",
                    resource_type='topic',
                    order=nodes_created + 1,
                    status='unlocked' if nodes_created == 0 else 'locked',
                    estimated_minutes=30
                )
                nodes_created += 1
                
            # Strategy B: Next Uncompleted Lessons
            # If subject is specified, pick next lessons. If not, pick from enrolled class subjects.
            from academic.models import Lesson
            
            lesson_filter = {}
            if subject_id:
                lesson_filter['chapter__subject_id'] = subject_id
            elif student.academic_class:
                lesson_filter['chapter__subject__academic_class'] = student.academic_class
            
            # This serves as a simple recommendation: grab first 3 lessons
            # In a real app, we'd filter out lessons the student has already completed (LessonProgress)
            rec_lessons = Lesson.objects.filter(**lesson_filter).order_by('chapter__subject', 'order')[:3]
            
            for lesson in rec_lessons:
                 # Avoid duplicates if we already added a node for this (unlikely in this simple logic but good practice)
                 LearningNode.objects.create(
                    learning_path=path,
                    title=f"Learn: {lesson.title}",
                    description="Recommended new topic.",
                    resource_type='video', # Defaulting to video
                    lesson=lesson,
                    order=nodes_created + 1,
                    status='unlocked' if nodes_created == 0 else 'locked',
                    estimated_minutes=lesson.duration_minutes
                )
                 nodes_created += 1

            serializer = self.get_serializer(path)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
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
        response_text = response_data['response']
        
        # Log interaction (simplified)
        if tenant:
            try:
                AIInteractionLog.objects.using(db_alias).create(
                    tenant=tenant,
                    user=request.user,
                    feature_used='tutor',
                    total_tokens=response_data.get('tokens_used', 0)
                )
            except Exception as log_err:
                print(f"⚠️ Interaction logging failed: {log_err}")
        
        return Response({'response': response_text})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
