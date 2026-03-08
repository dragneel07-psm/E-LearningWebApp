# Forced reload - V2
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AIInteractionLog, StudentAIReport, LearningPath, LearningNode
from .serializers import (
    AIInteractionLogSerializer,
    ContentChunkSearchRequestSerializer,
    ContentChunkSearchResponseSerializer,
    StudentAIReportSerializer,
    LearningPathSerializer,
    LearningNodeSerializer,
    AdminAssistantQueryRequestSerializer,
    AdminAssistantQueryResponseSerializer,
    AIGradingDraftSerializer,
    ApproveGradingDraftRequestSerializer,
    AiGeneratedArtifactSerializer,
    CreateGradingRubricSerializer,
    ExamPaperGenerateRequestSerializer,
    ExamPaperGenerateResponseSerializer,
    GradeSubmissionDraftResponseSerializer,
    GradeSubmissionRequestSerializer,
    GradingRubricSerializer,
    LessonArtifactResponseSerializer,
    QuizGenerationRequestSerializer,
    QuizGenerationResponseSerializer,
)
from users.models import UserAccount
from academic.models import Lesson
from academic.models import Student, Subject, Teacher
from academic.models.submission import Submission
from django.utils import timezone
from core.mixins import TenantScopedQuerysetMixin
from core.async_jobs import enqueue_job
from .services.rag_tutor_service import RAGTutorService
from .services.admin_assistant_service import AdminAssistantService
from .services.assisted_grading_service import AssistedGradingError, AssistedGradingService
from .services.exam_generator_service import ExamPaperGenerationError, ExamPaperGeneratorService
from .services.lesson_summary_service import LessonSummaryService
from .services.quiz_generator_service import QuizGeneratorService, QuizGenerationError
from .services.risk_analytics_service import RiskAnalyticsService
from .services.personalization_service import PersonalizationService
from .services.learning_path_service import LearningPathService
from .services.sm2_service import SM2Service
from .services.predictive_service import PredictiveAnalyticsService
from .services.reporting_service import ReportingService
from .services.schedule_service import ScheduleService
from .throttling import TutorChatRateThrottle
from .tasks import ai_index_content_task, generate_summary_task, generate_quiz_task
from .models import AIGradingDraft, AiGeneratedArtifact, GradingRubric, StudyEvent, TutorConversation, TutorMessage
from .models import SkillTag, SkillMastery, SkillPracticeEvent, AITokenBudget
from .serializers import StudyEventSerializer, TutorConversationSerializer, TutorConversationDetailSerializer, TutorMessageSerializer
from .serializers import SkillTagSerializer, SkillMasterySerializer, SkillPracticeEventSerializer, SkillPracticeUpdateSerializer
from .serializers import AITokenBudgetSerializer, AITokenBudgetCreateSerializer
from .services.bkt_service import BKTService
from .services.token_budget_service import TokenBudgetService, TokenBudgetExceeded

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
        """
        Mark a node as completed and apply SM-2 spaced repetition scheduling.

        Body (optional):
          quality (int 0-5): recall quality rating.
            5 = perfect, 4 = minor hesitation, 3 = correct with difficulty,
            2 = incorrect but remembered, 1 = close, 0 = blackout
            Default: 4 (correct with minor hesitation)

        Returns updated node data including next_review_at.
        """
        node = self.get_object()
        quality = int(request.data.get('quality', 4))
        quality = max(0, min(5, quality))

        sm2 = SM2Service()
        result = sm2.calculate(
            quality=quality,
            ease_factor=node.ease_factor,
            interval_days=node.interval_days,
            repetitions=node.repetitions,
        )

        node.status = 'completed'
        node.completed_at = timezone.now()
        node.ease_factor = result.ease_factor
        node.interval_days = result.interval_days
        node.repetitions = result.repetitions
        node.next_review_at = result.next_review_at
        node.last_quality = quality
        node.save()

        # Unlock next node (only if not a review — first completion)
        next_node = None
        if node.repetitions == 1:  # first successful pass
            next_node = LearningNode.objects.filter(
                learning_path=node.learning_path,
                order__gt=node.order,
                status='locked',
            ).order_by('order').first()
            if next_node:
                next_node.status = 'unlocked'
                next_node.save()

        return Response({
            'status': 'completed',
            'passed': result.passed,
            'next_review_at': result.next_review_at,
            'interval_days': result.interval_days,
            'ease_factor': result.ease_factor,
            'repetitions': result.repetitions,
            'next_node_unlocked': next_node is not None,
        })

    @action(detail=False, methods=['get'])
    def due(self, request):
        """
        Return all completed learning nodes that are due for review today.

        Optional query param:
          learning_path (UUID): filter to a specific path.
        """
        now = timezone.now()
        qs = self.get_queryset().filter(
            status='completed',
            next_review_at__lte=now,
        )
        path_id = request.query_params.get('learning_path')
        if path_id:
            qs = qs.filter(learning_path_id=path_id)

        serializer = self.get_serializer(qs, many=True)
        return Response({
            'count': qs.count(),
            'results': serializer.data,
        })

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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def at_risk_students(request):
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role not in {"teacher", "admin"}:
        return Response({"detail": "Only Teacher/Admin can access at-risk analytics."}, status=status.HTTP_403_FORBIDDEN)

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    class_id_raw = request.query_params.get("class_id")
    if class_id_raw in (None, ""):
        return Response({"error": "class_id is required"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        class_id = int(str(class_id_raw).strip())
    except (TypeError, ValueError):
        return Response({"error": "class_id must be a numeric id"}, status=status.HTTP_400_BAD_REQUEST)

    if role == "teacher":
        teacher = Teacher.objects.prefetch_related("assigned_classes").filter(user=request.user).first()
        if not teacher or not teacher.assigned_classes.filter(id=class_id).exists():
            return Response({"detail": "You do not have access to this class risk analytics."}, status=status.HTTP_403_FORBIDDEN)

    send_notifications = str(request.query_params.get("notify", "1")).strip().lower() not in {"0", "false", "no"}
    try:
        service = RiskAnalyticsService(tenant=tenant, user=request.user)
        payload = service.get_at_risk_students(class_id=class_id, send_notifications=send_notifications)
        return Response(payload, status=status.HTTP_200_OK)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enqueue_ai_index_content(request):
    content = str(request.data.get("content") or "").strip()
    if not content:
        return Response({"detail": "content is required"}, status=status.HTTP_400_BAD_REQUEST)

    metadata = request.data.get("metadata") or {}
    if not isinstance(metadata, dict):
        return Response({"detail": "metadata must be an object"}, status=status.HTTP_400_BAD_REQUEST)

    tenant_schema = str(getattr(getattr(request, "tenant", None), "schema_name", "public"))
    job = enqueue_job(
        ai_index_content_task,
        tenant_schema=tenant_schema,
        content=content,
        metadata=metadata,
        user_id=str(getattr(request.user, "pk", "")),
        job_name="ai.index_content",
        job_tenant_schema=tenant_schema,
    )
    return Response(job, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enqueue_ai_summary(request):
    content = str(request.data.get("content") or "").strip()
    if not content:
        return Response({"detail": "content is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        max_points = int(request.data.get("max_points", 5))
    except (TypeError, ValueError):
        return Response({"detail": "max_points must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

    tenant_schema = str(getattr(getattr(request, "tenant", None), "schema_name", "public"))
    job = enqueue_job(
        generate_summary_task,
        tenant_schema=tenant_schema,
        content=content,
        max_points=max_points,
        user_id=str(getattr(request.user, "pk", "")),
        job_name="ai.generate_summary",
        job_tenant_schema=tenant_schema,
    )
    return Response(job, status=status.HTTP_202_ACCEPTED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def enqueue_ai_quiz(request):
    content = str(request.data.get("content") or "").strip()
    if not content:
        return Response({"detail": "content is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        question_count = int(request.data.get("question_count", 5))
    except (TypeError, ValueError):
        return Response({"detail": "question_count must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

    tenant_schema = str(getattr(getattr(request, "tenant", None), "schema_name", "public"))
    job = enqueue_job(
        generate_quiz_task,
        tenant_schema=tenant_schema,
        content=content,
        question_count=question_count,
        user_id=str(getattr(request.user, "pk", "")),
        job_name="ai.generate_quiz",
        job_tenant_schema=tenant_schema,
    )
    return Response(job, status=status.HTTP_202_ACCEPTED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_assistant_query(request):
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    allowed_roles = {"admin", "staff", "school_admin", "accountant", "principal"}
    if role not in allowed_roles:
        return Response(
            {"detail": "Only SchoolAdmin/Accountant/Principal can access Admin AI Assistant."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None or str(getattr(tenant, "schema_name", "public")).strip().lower() == "public":
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = AdminAssistantQueryRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    question = serializer.validated_data["question"]

    try:
        service = AdminAssistantService(tenant=tenant, user=request.user)
        payload = service.answer_question(question)
        response_serializer = AdminAssistantQueryResponseSerializer(data=payload)
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_chunk_search(request):
    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = ContentChunkSearchRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    query = str(payload["query"]).strip()
    if not query:
        return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)

    context_payload = dict(payload.get("context") or {})
    if payload.get("source_type"):
        context_payload["source_type"] = payload["source_type"]
    if payload.get("source_id"):
        context_payload["source_id"] = payload["source_id"]

    service = RAGTutorService(tenant=tenant)
    service.top_k = int(payload.get("top_k", service.top_k))
    retrieved = service.retrieve_relevant_chunks(query, context=context_payload)

    min_similarity = payload.get("min_similarity", None)
    results = []
    for item in retrieved:
        chunk = item.get("chunk")
        if chunk is None:
            continue
        similarity = float(item.get("similarity") or 0.0)
        if min_similarity is not None and similarity < float(min_similarity):
            continue
        results.append(
            {
                "chunk_id": chunk.id,
                "source_type": chunk.source_type,
                "source_id": str(chunk.source_id),
                "text": chunk.text,
                "metadata": chunk.metadata or {},
                "similarity": round(similarity, 6),
            }
        )

    response_payload = {"count": len(results), "results": results}
    output = ContentChunkSearchResponseSerializer(data=response_payload)
    output.is_valid(raise_exception=True)
    return Response(output.validated_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_tutor_chat(request):
    """
    Tenant-aware AI tutor endpoint with RAG grounding and persistent conversation storage.

    Body:
      message (str): Student question.
      context (dict, optional): lesson_id, chapter_id, user_role, etc.
      conversation_id (UUID, optional): Resume an existing conversation.
        If omitted, a new conversation is created automatically.
      conversation_history (list, optional): Legacy client-side history.
        Ignored when conversation_id is provided (DB history is used instead).
    """
    message = str(request.data.get('message') or '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)

    context_payload = request.data.get('context') or {}
    if context_payload and not isinstance(context_payload, dict):
        return Response({'error': 'context must be an object'}, status=status.HTTP_400_BAD_REQUEST)
    context_payload = dict(context_payload)

    tenant = getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None)
    if tenant is None:
        return Response({'error': 'tenant context is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        db_alias = getattr(request, 'db_alias', 'default')
        context_payload.setdefault("user_role", str(getattr(request.user, "role", "") or "").strip().lower())

        # --- Resolve or create conversation ---
        conversation_id = request.data.get('conversation_id')
        conversation = None
        if conversation_id:
            try:
                conversation = TutorConversation.objects.using(db_alias).get(
                    id=conversation_id, user=request.user, tenant=tenant
                )
            except TutorConversation.DoesNotExist:
                pass

        if conversation is None:
            # Auto-title from first message (truncated)
            auto_title = message[:80] + ('…' if len(message) > 80 else '')
            lesson_id = context_payload.get('lesson_id')
            subject_id = context_payload.get('subject_id')
            student = getattr(request.user, 'student_profile', None)
            conversation = TutorConversation.objects.using(db_alias).create(
                tenant=tenant,
                user=request.user,
                student=student,
                lesson_id=lesson_id or None,
                subject_id=subject_id or None,
                title=auto_title,
            )

        # --- Build conversation history from DB ---
        db_messages = list(
            TutorMessage.objects.using(db_alias)
            .filter(conversation=conversation)
            .order_by('created_at')
            .values('role', 'content')
        )
        # Keep last 6 turns for context window efficiency
        history_payload = db_messages[-6:]

        # --- Token budget pre-flight check ---
        student = getattr(request.user, 'student_profile', None)
        budget_service = TokenBudgetService()
        try:
            budget_service.check(tenant=tenant, student=student, db_alias=db_alias)
        except TokenBudgetExceeded as exc:
            return Response(
                {
                    "error": "daily_budget_exceeded",
                    "detail": str(exc),
                    "used_today": exc.used,
                    "daily_limit": exc.limit,
                    "resets_at": exc.resets_at.isoformat(),
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # --- Persist the student's message ---
        TutorMessage.objects.using(db_alias).create(
            conversation=conversation,
            role='user',
            content=message,
        )

        # --- Call the AI service ---
        service = RAGTutorService(tenant=tenant)
        response_data = service.answer_question(
            message,
            context=context_payload,
            conversation_history=history_payload,
        )

        answer = str(response_data.get('answer') or '')
        sources = response_data.get('sources') if isinstance(response_data.get('sources'), list) else []
        usage = response_data.get('usage') if isinstance(response_data.get('usage'), dict) else {}
        is_demo = bool(response_data.get("is_demo"))
        fallback_reason = response_data.get("fallback_reason")
        error = response_data.get("error")
        prompt_tokens = int(usage.get('prompt_tokens') or 0)
        completion_tokens = int(usage.get('completion_tokens') or 0)
        confidence = float(response_data.get('confidence') or 0.0)
        confidence_label = str(response_data.get('confidence_label') or 'low')
        response_mode = str(response_data.get('mode') or context_payload.get('mode') or 'direct')

        # --- Persist the assistant's response ---
        TutorMessage.objects.using(db_alias).create(
            conversation=conversation,
            role='assistant',
            content=answer,
            sources=sources,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            is_demo=is_demo,
            confidence=confidence,
            confidence_label=confidence_label,
            mode=response_mode,
        )

        # --- Deduct tokens from budget ---
        total_tokens = prompt_tokens + completion_tokens
        budget_status = budget_service.deduct(
            tenant=tenant, student=student, tokens_used=total_tokens, db_alias=db_alias
        )

        # --- Log AI interaction ---
        try:
            AIInteractionLog.objects.using(db_alias).create(
                tenant=tenant,
                user=request.user,
                feature_used='tutor_rag',
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
            )
        except Exception as log_err:
            logger.warning("Tutor interaction logging failed: %s", log_err)

        return Response(
            {
                'conversation_id': str(conversation.id),
                'answer': answer,
                'sources': sources,
                'confidence': confidence,
                'confidence_label': confidence_label,
                'mode': response_mode,
                'usage': {
                    'model': str(usage.get('model') or 'fallback'),
                    'prompt_tokens': prompt_tokens,
                    'completion_tokens': completion_tokens,
                },
                'is_demo': is_demo,
                'fallback_reason': fallback_reason,
                'error': error,
                'budget': budget_status,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TutorConversationViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve persistent tutor conversations for the current user.
    Each student sees only their own conversations (tenant-scoped).
    """
    queryset = TutorConversation.objects.all()
    serializer_class = TutorConversationSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant'

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TutorConversationDetailSerializer
        return TutorConversationSerializer

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Return all messages in a conversation (paginated, oldest first)."""
        conversation = self.get_object()
        msgs = TutorMessage.objects.filter(conversation=conversation).order_by('created_at')
        serializer = TutorMessageSerializer(msgs, many=True)
        return Response({'count': msgs.count(), 'results': serializer.data})


class SkillTagViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Manage skill tags (teacher/admin only for write; students can read).
    Teachers create skill tags and link them to lessons/assessments.
    """
    queryset = SkillTag.objects.all()
    serializer_class = SkillTagSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant'

    def get_queryset(self):
        qs = super().get_queryset()
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs.order_by('name')

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None) or getattr(self.request.user, 'tenant', None)
        serializer.save(tenant=tenant, created_by=self.request.user)


class SkillMasteryViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only view of a student's skill mastery estimates.
    Students see their own; teachers/admins can filter by student.
    """
    queryset = SkillMastery.objects.select_related('skill_tag', 'skill_tag__subject').all()
    serializer_class = SkillMasterySerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'skill_tag__tenant'

    def get_queryset(self):
        qs = super().get_queryset()
        role = str(getattr(self.request.user, 'role', '') or '').lower()
        if role == 'student':
            student = getattr(self.request.user, 'student_profile', None)
            if student is None:
                return qs.none()
            qs = qs.filter(student=student)
        else:
            student_id = self.request.query_params.get('student_id')
            if student_id:
                qs = qs.filter(student_id=student_id)
        subject_id = self.request.query_params.get('subject_id')
        if subject_id:
            qs = qs.filter(skill_tag__subject_id=subject_id)
        return qs.order_by('p_mastery')

    @action(detail=False, methods=['get'])
    def gaps(self, request):
        """
        Return the student's lowest-mastery skills (top skill gaps).
        Students only; optionally filter by ?limit=N (default 5).
        """
        role = str(getattr(request.user, 'role', '') or '').lower()
        if role != 'student':
            return Response({'detail': 'Only students can access skill gaps.'}, status=status.HTTP_403_FORBIDDEN)
        student = getattr(request.user, 'student_profile', None)
        if student is None:
            return Response({'detail': 'Student profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            limit = min(int(request.query_params.get('limit', 5)), 20)
        except ValueError:
            limit = 5
        db_alias = getattr(request, 'db_alias', 'default')
        bkt = BKTService()
        gaps = bkt.get_skill_gaps(student, db_alias=db_alias, limit=limit)
        serializer = SkillMasterySerializer(gaps, many=True)
        return Response({'count': len(gaps), 'results': serializer.data})

    @action(detail=False, methods=['post'])
    def update_mastery(self, request):
        """
        Record a practice event and update the student's BKT mastery.

        Body:
          skill_tag_id (UUID): the skill being practiced.
          correct (bool): whether the student answered correctly.
          score_pct (float 0-100): raw score percentage.
          source_type (str): 'assessment' | 'lesson' | 'tutor'
          source_id (str): ID of the source object (optional).
        """
        role = str(getattr(request.user, 'role', '') or '').lower()
        if role != 'student':
            return Response({'detail': 'Only students can update mastery.'}, status=status.HTTP_403_FORBIDDEN)
        student = getattr(request.user, 'student_profile', None)
        if student is None:
            return Response({'detail': 'Student profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SkillPracticeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        db_alias = getattr(request, 'db_alias', 'default')
        try:
            skill = SkillTag.objects.using(db_alias).get(id=data['skill_tag_id'])
        except SkillTag.DoesNotExist:
            return Response({'detail': 'Skill tag not found.'}, status=status.HTTP_404_NOT_FOUND)

        bkt = BKTService()
        result = bkt.observe(
            student=student,
            skill_tag=skill,
            correct=data['correct'],
            score_pct=data.get('score_pct', 0.0),
            source_type=data.get('source_type', 'assessment'),
            source_id=str(data.get('source_id', '')),
            db_alias=db_alias,
        )

        return Response({
            'skill_tag': str(skill.id),
            'skill_name': skill.name,
            'correct': result.correct,
            'mastery_before': round(result.mastery_before, 4),
            'mastery_after': round(result.mastery_after, 4),
            'observations': result.observations,
            'is_mastered': bkt.is_mastered(result.mastery_after),
        }, status=status.HTTP_200_OK)


class AITokenBudgetViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    """
    Admin/SaaS: manage per-tenant and per-student daily token budgets.
    Students: read-only access to their own budget status via GET /my-usage/.
    """
    queryset = AITokenBudget.objects.all()
    serializer_class = AITokenBudgetSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant'
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        role = str(getattr(self.request.user, 'role', '') or '').lower()
        if role == 'student':
            # Students only see their own budget via /my-usage/ — block list view
            return qs.none()
        student_id = self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """
        Create or update a token budget.
        Admin/SaaS only.

        Body:
          daily_limit_tokens (int): Max tokens per day. 0 = unlimited.
          student_id (UUID, optional): Per-student override. Omit for tenant-wide.
          is_active (bool): Whether to enforce this budget.
        """
        role = str(getattr(request.user, 'role', '') or '').lower()
        if role not in ('admin', 'saas_admin', 'staff'):
            return Response({'detail': 'Only admins can manage token budgets.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AITokenBudgetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tenant = getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None)
        db_alias = getattr(request, 'db_alias', 'default')

        student = None
        if data.get('student_id'):
            try:
                from academic.models import Student
                student = Student.objects.using(db_alias).get(pk=data['student_id'])
            except Student.DoesNotExist:
                return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        budget_service = TokenBudgetService()
        budget = budget_service.create_budget(
            tenant=tenant,
            daily_limit_tokens=data['daily_limit_tokens'],
            student=student,
            created_by=request.user,
            db_alias=db_alias,
        )
        budget.is_active = data.get('is_active', True)
        budget.save(using=db_alias, update_fields=['is_active', 'updated_at'])

        return Response(AITokenBudgetSerializer(budget).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def my_usage(self, request):
        """
        Return the current budget status for the requesting student.
        Works for all roles — shows their effective budget.
        """
        tenant = getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None)
        db_alias = getattr(request, 'db_alias', 'default')
        student = getattr(request.user, 'student_profile', None)

        budget_service = TokenBudgetService()
        status_data = budget_service.get_status(tenant=tenant, student=student, db_alias=db_alias)
        return Response(status_data)


def _validate_lesson_artifact_lang(request):
    lang = LessonSummaryService.normalize_lang(request.query_params.get("lang", "en"))
    requested = str(request.query_params.get("lang", "en")).strip().lower()
    if requested not in {"", "en", "ne"}:
        return None, Response({"error": "lang must be 'en' or 'ne'."}, status=status.HTTP_400_BAD_REQUEST)
    return lang, None


def _lesson_artifact_response(request, lesson_id: int, artifact_type: str):
    lang, lang_error = _validate_lesson_artifact_lang(request)
    if lang_error:
        return lang_error

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    if not Lesson.objects.filter(pk=lesson_id).exists():
        return Response({"error": "lesson not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        service = LessonSummaryService(tenant=tenant, user=request.user)
        payload = service.generate(
            lesson_id=int(lesson_id),
            artifact_type=artifact_type,
            lang=lang,
        )
        serializer = LessonArtifactResponseSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_lesson_summarize(request, lesson_id: int):
    return _lesson_artifact_response(request, lesson_id=lesson_id, artifact_type="summary")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_lesson_exam_notes(request, lesson_id: int):
    return _lesson_artifact_response(request, lesson_id=lesson_id, artifact_type="exam_notes")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_quiz_generate(request):
    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role not in {"teacher", "admin"}:
        return Response(
            {"detail": "Only Teacher/Admin can generate quizzes."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = QuizGenerationRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    try:
        service = QuizGeneratorService(tenant=tenant, user=request.user)
        result = service.generate(
            source_type=payload["source_type"],
            source_id=str(payload["source_id"]),
            difficulty=payload["difficulty"],
            count=int(payload["count"]),
        )
        output = QuizGenerationResponseSerializer(data=result)
        output.is_valid(raise_exception=True)
        return Response(output.validated_data, status=status.HTTP_200_OK)
    except QuizGenerationError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _is_teacher_or_admin(user) -> bool:
    role = str(getattr(user, "role", "") or "").strip().lower()
    return role in {"teacher", "admin"}


def _teacher_can_manage_submission(user, submission: Submission) -> bool:
    role = str(getattr(user, "role", "") or "").strip().lower()
    if role == "admin":
        return True
    if role != "teacher":
        return False

    teacher = Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
    if not teacher:
        return False

    assessment = getattr(submission, "assessment", None)
    subject = getattr(assessment, "subject", None)
    if not subject:
        return False

    if getattr(subject, "teacher_id", None) == teacher.teacher_id:
        return True
    if subject.additional_teachers.filter(teacher_id=teacher.teacher_id).exists():
        return True

    class_id = getattr(subject, "academic_class_id", None)
    return bool(class_id and teacher.assigned_classes.filter(id=class_id).exists())


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_exam_generate(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can generate exam papers."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = ExamPaperGenerateRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    try:
        service = ExamPaperGeneratorService(tenant=tenant, user=request.user)
        result = service.generate(
            class_id=payload["class_id"],
            subject_id=payload["subject_id"],
            units=payload.get("units") or [],
            marks=int(payload["marks"]),
            difficulty_mix=payload["difficulty_mix"],
        )
        output = ExamPaperGenerateResponseSerializer(data=result)
        output.is_valid(raise_exception=True)
        return Response(output.validated_data, status=status.HTTP_200_OK)
    except ExamPaperGenerationError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_generated_artifacts(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can access generated artifacts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    queryset = AiGeneratedArtifact.objects.filter(tenant=tenant).order_by("-created_at")

    artifact_type = str(request.query_params.get("artifact_type") or "").strip()
    source_type = str(request.query_params.get("source_type") or "").strip()
    source_id = str(request.query_params.get("source_id") or "").strip()

    if artifact_type:
        queryset = queryset.filter(artifact_type=artifact_type)
    if source_type:
        queryset = queryset.filter(source_type=source_type)
    if source_id:
        queryset = queryset.filter(source_id=source_id)

    try:
        limit = int(request.query_params.get("limit", 20))
    except (TypeError, ValueError):
        return Response({"error": "limit must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
    limit = max(1, min(100, limit))

    serializer = AiGeneratedArtifactSerializer(queryset[:limit], many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_grading_rubrics(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can manage grading rubrics."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        rubrics = GradingRubric.objects.filter(tenant=tenant).order_by("-created_at")
        serializer = GradingRubricSerializer(rubrics, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = CreateGradingRubricSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data
    rubric = GradingRubric.objects.create(
        tenant=tenant,
        title=payload["title"],
        criteria=payload.get("criteria") or [],
        total_points=int(payload["total_points"]),
        created_by=request.user if getattr(request.user, "is_authenticated", False) else None,
    )
    output = GradingRubricSerializer(rubric)
    return Response(output.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_grading_drafts(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can access grading drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    queryset = AIGradingDraft.objects.filter(tenant=tenant).select_related("submission", "submission__assessment", "submission__assessment__subject")
    submission_id = str(request.query_params.get("submission_id") or "").strip()
    if submission_id:
        queryset = queryset.filter(submission__submission_id=submission_id)

    role = str(getattr(request.user, "role", "") or "").strip().lower()
    if role == "teacher":
        allowed_ids: list[str] = []
        for draft in queryset:
            if _teacher_can_manage_submission(request.user, draft.submission):
                allowed_ids.append(str(draft.id))
        queryset = queryset.filter(id__in=allowed_ids)

    serializer = AIGradingDraftSerializer(queryset.order_by("-created_at")[:50], many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_grade_submission(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can generate AI grading drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = GradeSubmissionRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    submission = Submission.objects.select_related("assessment", "assessment__subject").filter(submission_id=payload["submission_id"]).first()
    if submission is None:
        return Response({"error": "submission not found"}, status=status.HTTP_404_NOT_FOUND)
    if str(getattr(request.user, "role", "") or "").strip().lower() == "teacher" and not _teacher_can_manage_submission(request.user, submission):
        return Response({"detail": "You can grade only submissions in your assigned classes/subjects."}, status=status.HTTP_403_FORBIDDEN)

    try:
        service = AssistedGradingService(tenant=tenant, user=request.user)
        draft = service.generate_draft(
            submission_id=str(payload["submission_id"]),
            rubric_id=str(payload["rubric_id"]),
            request=request,
        )
        output = GradeSubmissionDraftResponseSerializer(
            data={
                "draft_id": str(draft.id),
                "score": float(draft.score),
                "feedback": draft.feedback,
                "criteria_breakdown": draft.criteria_breakdown if isinstance(draft.criteria_breakdown, list) else [],
                "status": draft.status,
            }
        )
        output.is_valid(raise_exception=True)
        return Response(output.validated_data, status=status.HTTP_200_OK)
    except AssistedGradingError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([TutorChatRateThrottle])
def ai_approve_grading_draft(request):
    if not _is_teacher_or_admin(request.user):
        return Response(
            {"detail": "Only Teacher/Admin can approve AI grading drafts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tenant = getattr(request, "tenant", None) or getattr(request.user, "tenant", None)
    if tenant is None:
        return Response({"error": "tenant context is required"}, status=status.HTTP_400_BAD_REQUEST)

    serializer = ApproveGradingDraftRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    payload = serializer.validated_data

    draft = AIGradingDraft.objects.select_related("submission", "submission__assessment", "submission__assessment__subject").filter(
        id=payload["draft_id"],
        tenant=tenant,
    ).first()
    if draft is None:
        return Response({"error": "draft not found"}, status=status.HTTP_404_NOT_FOUND)
    if str(getattr(request.user, "role", "") or "").strip().lower() == "teacher" and not _teacher_can_manage_submission(request.user, draft.submission):
        return Response({"detail": "You can approve only submissions in your assigned classes/subjects."}, status=status.HTTP_403_FORBIDDEN)

    try:
        service = AssistedGradingService(tenant=tenant, user=request.user)
        approved = service.approve_draft(draft_id=str(payload["draft_id"]), request=request)
        return Response(
            {
                "status": approved.status,
                "draft_id": str(approved.id),
                "score": float(approved.score),
                "approved_at": approved.approved_at,
            },
            status=status.HTTP_200_OK,
        )
    except AssistedGradingError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
