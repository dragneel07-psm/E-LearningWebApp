import json
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from academic.models import AcademicYear
from academic.models.assessment import (
    Assessment,
    Result,
    StudentPromotionDecision,
    StudentPromotionDecisionHistory,
)
from academic.models.question import Question
from academic.models.submission import Submission
from academic.models.student import Student
from academic.serializers.assessment import (
    AssessmentSerializer, QuestionSerializer, 
    SubmissionSerializer, ResultSerializer
)
from academic.services.grading_service import GradingService
from academic.services.academic_year_service import (
    PROMOTION_HOLD_REASON_LABELS,
    PromotionRules,
    ensure_current_academic_year,
    list_student_promotion_candidates,
    promote_students_to_next_class,
)


def _to_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)


def _find_academic_year(raw_year):
    if raw_year is None or raw_year == '':
        return None
    if isinstance(raw_year, AcademicYear):
        return raw_year
    if str(raw_year).isdigit():
        return AcademicYear.objects.filter(pk=int(raw_year)).first()
    return AcademicYear.objects.filter(name=str(raw_year)).first()


def _resolve_request_year(request):
    raw_year = request.query_params.get('academic_year')
    if raw_year:
        return _find_academic_year(raw_year), True
    return ensure_current_academic_year(), False

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _can_publish_results(self, user):
        return bool(
            user
            and user.is_authenticated
            and getattr(user, 'role', None) in ['teacher', 'admin', 'staff', 'management', 'saas_admin']
        )

    def _promotion_scope_for_assessment(self, assessment):
        if getattr(assessment, 'section_id', None):
            return {'section': assessment.section}
        if getattr(assessment, 'subject_id', None) and getattr(assessment.subject, 'academic_class_id', None):
            return {'academic_class': assessment.subject.academic_class}
        return {}

    def _promotion_rules_from_request(self, request, assessment: Assessment | None = None):
        payload = {}
        nested = request.data.get('promotion_rules')
        if isinstance(nested, dict):
            payload.update(nested)

        direct_fields = [
            'min_score_percentage',
            'min_attendance_percentage',
            'manual_promote_student_ids',
            'manual_hold_student_ids',
        ]
        for field_name in direct_fields:
            if field_name in request.data:
                payload[field_name] = request.data.get(field_name)
            elif field_name in request.query_params:
                payload[field_name] = request.query_params.get(field_name)

        rules = PromotionRules.from_payload(payload)
        if assessment is not None:
            return self._merge_stored_promotion_decisions(assessment, rules)
        return rules

    def _merge_stored_promotion_decisions(self, assessment: Assessment, rules: PromotionRules) -> PromotionRules:
        promote_ids = {value.lower(): value for value in rules.manual_promote_student_ids}
        hold_ids = {value.lower(): value for value in rules.manual_hold_student_ids}

        stored_decisions = StudentPromotionDecision.objects.filter(assessment=assessment).select_related('student')
        for decision in stored_decisions:
            student_id = str(decision.student_id)
            key = student_id.lower()
            if decision.decision == 'promote':
                promote_ids[key] = student_id
                hold_ids.pop(key, None)
            elif decision.decision == 'hold':
                hold_ids[key] = student_id
                promote_ids.pop(key, None)

        return PromotionRules(
            min_score_percentage=rules.min_score_percentage,
            min_attendance_percentage=rules.min_attendance_percentage,
            manual_promote_student_ids=tuple(promote_ids.values()),
            manual_hold_student_ids=tuple(hold_ids.values()),
        )

    def _decision_reason_from_request(self, request) -> str:
        reason = str(request.data.get('decision_reason') or '').strip()
        return reason

    def _record_promotion_history(
        self,
        *,
        assessment: Assessment,
        student_id: str,
        action: str,
        previous_decision: str | None,
        new_decision: str | None,
        decision_reason: str,
        user,
    ) -> None:
        StudentPromotionDecisionHistory.objects.create(
            assessment=assessment,
            student_id=student_id,
            action=action,
            previous_decision=previous_decision,
            new_decision=new_decision,
            decision_reason=decision_reason,
            decided_by=user,
        )

    def _promotion_exception_rows(self, assessment: Assessment, request, rules: PromotionRules):
        rows = list_student_promotion_candidates(
            academic_year=assessment.academic_year,
            rules=rules,
            include_unpublished_results=True,
            **self._promotion_scope_for_assessment(assessment),
        )
        decision_map = {
            str(item.student_id): item
            for item in StudentPromotionDecision.objects.filter(assessment=assessment).select_related('decided_by')
        }
        history_map = {}
        history_rows = (
            StudentPromotionDecisionHistory.objects
            .filter(assessment=assessment)
            .select_related('decided_by')
            .order_by('-created_at')
        )
        for history_item in history_rows:
            key = str(history_item.student_id)
            if key not in history_map:
                history_map[key] = []
            if len(history_map[key]) >= 5:
                continue
            history_map[key].append(
                {
                    'action': history_item.action,
                    'previous_decision': history_item.previous_decision,
                    'new_decision': history_item.new_decision,
                    'decision_reason': history_item.decision_reason,
                    'decided_by': getattr(history_item.decided_by, 'username', None),
                    'decided_by_name': (
                        f"{history_item.decided_by.first_name} {history_item.decided_by.last_name}".strip()
                        if getattr(history_item, 'decided_by', None)
                        else ''
                    ),
                    'created_at': history_item.created_at,
                }
            )

        for row in rows:
            student_id = str(row.get('student_id'))
            saved_decision = decision_map.get(student_id)
            recommended = row.get('recommended_action')
            effective_action = recommended
            is_override = False
            decision_payload = None

            if saved_decision is not None:
                effective_action = saved_decision.decision
                is_override = saved_decision.decision != recommended
                decision_payload = {
                    'decision': saved_decision.decision,
                    'decision_reason': saved_decision.decision_reason,
                    'decided_by': getattr(saved_decision.decided_by, 'username', None),
                    'decided_by_name': (
                        f"{saved_decision.decided_by.first_name} {saved_decision.decided_by.last_name}".strip()
                        if getattr(saved_decision, 'decided_by', None)
                        else ''
                    ),
                    'updated_at': saved_decision.updated_at,
                }

            row['effective_action'] = effective_action
            row['is_override'] = bool(is_override)
            row['decision'] = decision_payload
            row['history'] = history_map.get(student_id, [])

        class_filter = request.query_params.get('class') or request.data.get('class')
        section_filter = request.query_params.get('section') or request.data.get('section')
        fail_reason_filter = request.query_params.get('fail_reason') or request.data.get('fail_reason')

        if class_filter:
            rows = [row for row in rows if str(row.get('class_id') or '') == str(class_filter)]
        if section_filter:
            rows = [row for row in rows if str(row.get('section_id') or '') == str(section_filter)]
        if fail_reason_filter:
            if fail_reason_filter == 'none':
                rows = [row for row in rows if not row.get('hold_reason')]
            else:
                rows = [row for row in rows if row.get('hold_reason') == fail_reason_filter]

        return rows

    def _promotion_exception_response(self, assessment: Assessment, request):
        rules = self._promotion_rules_from_request(request)
        rows = self._promotion_exception_rows(assessment, request, rules)
        locked = bool(assessment.results_published)

        recommended_promote = sum(1 for row in rows if row.get('recommended_action') == 'promote')
        recommended_hold = sum(1 for row in rows if row.get('recommended_action') == 'hold')
        decided_promote = sum(1 for row in rows if row.get('effective_action') == 'promote')
        decided_hold = sum(1 for row in rows if row.get('effective_action') == 'hold')
        overrides = sum(1 for row in rows if row.get('is_override'))
        pending = sum(1 for row in rows if not row.get('decision'))

        class_counts = {}
        section_counts = {}
        fail_reason_counts = {}
        for row in rows:
            class_id = row.get('class_id')
            class_name = row.get('class_name') or 'Unknown'
            if class_id is not None:
                key = str(class_id)
                item = class_counts.setdefault(key, {'id': class_id, 'name': class_name, 'count': 0})
                item['count'] += 1

            section_id = row.get('section_id')
            section_name = row.get('section_name') or 'No Section'
            if section_id is not None:
                key = str(section_id)
                item = section_counts.setdefault(
                    key,
                    {
                        'id': section_id,
                        'class_id': class_id,
                        'name': section_name,
                        'count': 0,
                    },
                )
                item['count'] += 1

            reason_code = row.get('hold_reason') or 'none'
            reason_item = fail_reason_counts.setdefault(
                reason_code,
                {
                    'code': reason_code,
                    'label': PROMOTION_HOLD_REASON_LABELS.get(reason_code, 'No hold reason'),
                    'count': 0,
                },
            )
            reason_item['count'] += 1

        summary = {
            'total_students': len(rows),
            'recommended_promote': recommended_promote,
            'recommended_hold': recommended_hold,
            'decided_promote': decided_promote,
            'decided_hold': decided_hold,
            'overrides': overrides,
            'pending_decisions': pending,
        }

        return {
            'assessment_id': str(assessment.assessment_id),
            'assessment_title': assessment.title,
            'is_final_assessment': bool(assessment.is_final_assessment),
            'locked': locked,
            'lock_reason': (
                'Promotion decisions are locked because final results are published. '
                'Unpublish/reopen results before editing exceptions.'
                if locked else ''
            ),
            'rules': {
                'min_score_percentage': rules.min_score_percentage,
                'min_attendance_percentage': rules.min_attendance_percentage,
            },
            'summary': summary,
            'students': rows,
            'available_filters': {
                'classes': list(class_counts.values()),
                'sections': list(section_counts.values()),
                'fail_reasons': list(fail_reason_counts.values()),
            },
        }

    def get_queryset(self):
        queryset = Assessment.objects.select_related('academic_year', 'subject', 'subject__academic_class', 'section').all()
        requested_year, has_year_filter = _resolve_request_year(self.request)
        if has_year_filter and not requested_year:
            return queryset.none()
        if requested_year:
            queryset = queryset.filter(academic_year=requested_year)

        subject_id = self.request.query_params.get('subject')
        section_id = self.request.query_params.get('section')
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if section_id:
            queryset = queryset.filter(section_id=section_id)
            
        # If student, filter by their section or section-less assessments
        try:
            student = Student.objects.get(user=self.request.user)
            if student.section:
                queryset = queryset.filter(models.Q(section=student.section) | models.Q(section__isnull=True))
        except Student.DoesNotExist:
            pass
            
        return queryset

    def perform_create(self, serializer):
        academic_year = serializer.validated_data.get('academic_year') or ensure_current_academic_year()
        serializer.save(academic_year=academic_year)

    def perform_update(self, serializer):
        instance = self.get_object()
        was_published = bool(instance.results_published)
        serializer.save()
        updated = serializer.instance

        if (
            not was_published
            and updated.results_published
            and updated.is_final_assessment
            and _to_bool(self.request.data.get('auto_upgrade_students'), True)
        ):
            promote_students_to_next_class(
                academic_year=updated.academic_year,
                rules=self._promotion_rules_from_request(self.request, updated),
                **self._promotion_scope_for_assessment(updated),
            )

    @action(detail=True, methods=['post'])
    def publish_results(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {'detail': 'You do not have permission to publish results.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        publish = _to_bool(request.data.get('publish'), True)
        was_published = bool(assessment.results_published)

        if publish:
            assessment.results_published = True
            assessment.results_published_at = timezone.now()
        else:
            assessment.results_published = False
            assessment.results_published_at = None
        assessment.save(update_fields=['results_published', 'results_published_at'])

        promotion_summary = None
        if (
            publish
            and not was_published
            and assessment.is_final_assessment
            and _to_bool(request.data.get('auto_upgrade_students'), True)
        ):
            promotion_summary = promote_students_to_next_class(
                academic_year=assessment.academic_year,
                rules=self._promotion_rules_from_request(request, assessment),
                **self._promotion_scope_for_assessment(assessment)
            )

        return Response(
            {
                'assessment_id': str(assessment.assessment_id),
                'results_published': assessment.results_published,
                'results_published_at': assessment.results_published_at,
                'is_final_assessment': assessment.is_final_assessment,
                'student_promotion': promotion_summary,
            }
        )

    @action(detail=True, methods=['get'])
    def promotion_exceptions(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {'detail': 'You do not have permission to review promotion exceptions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not assessment.is_final_assessment:
            return Response(
                {'detail': 'Promotion exceptions are only available for final assessments.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(self._promotion_exception_response(assessment, request))

    @action(detail=True, methods=['post'], url_path='promotion_exceptions/decide')
    def promotion_exceptions_decide(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {'detail': 'You do not have permission to update promotion exceptions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not assessment.is_final_assessment:
            return Response(
                {'detail': 'Promotion exceptions are only available for final assessments.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if assessment.results_published:
            return Response(
                {
                    'detail': (
                        'Promotion decisions are locked because final results are published. '
                        'Unpublish/reopen results before editing exceptions.'
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        student_id = str(request.data.get('student_id') or '').strip()
        action_name = str(request.data.get('action') or '').strip().lower()
        if not student_id:
            return Response({'detail': 'student_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if action_name not in {'promote', 'hold', 'override', 'clear'}:
            return Response(
                {'detail': "action must be one of: promote, hold, override, clear."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision_reason = self._decision_reason_from_request(request)
        if not decision_reason:
            return Response(
                {'detail': 'decision_reason is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rules = self._promotion_rules_from_request(request)
        candidate_rows = list_student_promotion_candidates(
            academic_year=assessment.academic_year,
            rules=rules,
            include_unpublished_results=True,
            **self._promotion_scope_for_assessment(assessment),
        )
        row_map = {str(item.get('student_id')): item for item in candidate_rows}
        candidate = row_map.get(student_id)
        if candidate is None:
            return Response(
                {'detail': 'Student is not part of this assessment promotion scope.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action_name == 'clear':
            existing_decision = StudentPromotionDecision.objects.filter(
                assessment=assessment,
                student_id=student_id,
            ).first()
            deleted_count, _ = StudentPromotionDecision.objects.filter(
                assessment=assessment,
                student_id=student_id,
            ).delete()
            if deleted_count and existing_decision is not None:
                self._record_promotion_history(
                    assessment=assessment,
                    student_id=student_id,
                    action='clear',
                    previous_decision=existing_decision.decision,
                    new_decision=None,
                    decision_reason=decision_reason,
                    user=request.user,
                )
            response_payload = self._promotion_exception_response(assessment, request)
            return Response(
                {
                    'updated': deleted_count > 0,
                    'cleared': bool(deleted_count),
                    'student_id': student_id,
                    'summary': response_payload.get('summary', {}),
                }
            )

        final_decision = action_name
        if action_name == 'override':
            recommended = candidate.get('recommended_action')
            final_decision = 'hold' if recommended == 'promote' else 'promote'

        existing_decision = StudentPromotionDecision.objects.filter(
            assessment=assessment,
            student_id=student_id,
        ).first()
        previous_decision = existing_decision.decision if existing_decision is not None else None

        StudentPromotionDecision.objects.update_or_create(
            assessment=assessment,
            student_id=student_id,
            defaults={
                'decision': final_decision,
                'decision_reason': decision_reason,
                'decided_by': request.user,
            },
        )
        self._record_promotion_history(
            assessment=assessment,
            student_id=student_id,
            action=action_name,
            previous_decision=previous_decision,
            new_decision=final_decision,
            decision_reason=decision_reason,
            user=request.user,
        )

        response_payload = self._promotion_exception_response(assessment, request)
        updated_row = next(
            (item for item in response_payload.get('students', []) if str(item.get('student_id')) == student_id),
            None,
        )
        return Response(
            {
                'updated': True,
                'student_id': student_id,
                'decision': final_decision,
                'student': updated_row,
                'summary': response_payload.get('summary', {}),
            }
        )

    @action(detail=True, methods=['post'], url_path='promotion_exceptions/bulk')
    def promotion_exceptions_bulk(self, request, pk=None):
        if not self._can_publish_results(request.user):
            return Response(
                {'detail': 'You do not have permission to update promotion exceptions.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        assessment = self.get_object()
        if not assessment.is_final_assessment:
            return Response(
                {'detail': 'Promotion exceptions are only available for final assessments.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if assessment.results_published:
            return Response(
                {
                    'detail': (
                        'Promotion decisions are locked because final results are published. '
                        'Unpublish/reopen results before editing exceptions.'
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        action_name = str(request.data.get('action') or '').strip().lower()
        if action_name not in {'promote', 'hold', 'override', 'clear'}:
            return Response(
                {'detail': "action must be one of: promote, hold, override, clear."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision_reason = self._decision_reason_from_request(request)
        if not decision_reason:
            return Response(
                {'detail': 'decision_reason is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rules = self._promotion_rules_from_request(request)
        rows = self._promotion_exception_rows(assessment, request, rules)
        if not rows:
            return Response(
                {
                    'updated': 0,
                    'matched_students': 0,
                    'summary': self._promotion_exception_response(assessment, request).get('summary', {}),
                }
            )

        matched_student_ids = [str(item.get('student_id')) for item in rows]
        updated_count = 0

        with transaction.atomic():
            existing_map = {
                str(item.student_id): item
                for item in StudentPromotionDecision.objects.filter(
                    assessment=assessment,
                    student_id__in=matched_student_ids,
                )
            }
            if action_name == 'clear':
                for student_id, existing_decision in existing_map.items():
                    self._record_promotion_history(
                        assessment=assessment,
                        student_id=student_id,
                        action='clear',
                        previous_decision=existing_decision.decision,
                        new_decision=None,
                        decision_reason=decision_reason,
                        user=request.user,
                    )
                    updated_count += 1
                if matched_student_ids:
                    StudentPromotionDecision.objects.filter(
                        assessment=assessment,
                        student_id__in=matched_student_ids,
                    ).delete()
            else:
                for row in rows:
                    student_id = str(row.get('student_id'))
                    if action_name == 'override':
                        recommended = row.get('recommended_action')
                        decision = 'hold' if recommended == 'promote' else 'promote'
                    else:
                        decision = action_name

                    previous_decision = existing_map.get(student_id).decision if student_id in existing_map else None
                    StudentPromotionDecision.objects.update_or_create(
                        assessment=assessment,
                        student_id=student_id,
                        defaults={
                            'decision': decision,
                            'decision_reason': decision_reason,
                            'decided_by': request.user,
                        },
                    )
                    self._record_promotion_history(
                        assessment=assessment,
                        student_id=student_id,
                        action=action_name,
                        previous_decision=previous_decision,
                        new_decision=decision,
                        decision_reason=decision_reason,
                        user=request.user,
                    )
                    updated_count += 1

        response_payload = self._promotion_exception_response(assessment, request)
        return Response(
            {
                'updated': updated_count,
                'matched_students': len(matched_student_ids),
                'action': action_name,
                'summary': response_payload.get('summary', {}),
            }
        )

    @action(detail=False, methods=['get'])
    def gradebook(self, request):
        """
        Returns a matrix of students and their assessment scores for a subject.
        """
        subject_id = request.query_params.get('subject')
        if not subject_id:
            return Response({'error': 'subject_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Get all assessments for this subject
        assessments = self.get_queryset().filter(subject_id=subject_id).order_by('scheduled_at', 'created_at')
        if not assessments.exists():
            # Still get students even if no assessments? 
            # Better to get students from the subject relation. 
            pass

        # 2. Get students enrolled in this subject's class/section
        # Assuming subjects belong to a class and class has students
        from academic.models.subject import Subject
        try:
            subject_qs = Subject.objects.filter(id=subject_id)
            requested_year, has_year_filter = _resolve_request_year(request)
            if has_year_filter and not requested_year:
                return Response({'error': 'Academic year not found'}, status=404)
            if requested_year:
                subject_qs = subject_qs.filter(academic_year=requested_year)
            subject = subject_qs.get()
            academic_class = subject.academic_class
            students = Student.objects.filter(academic_class=academic_class)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=404)

        # 3. Get all results for these assessments and students
        results = Result.objects.filter(assessment__in=assessments, student__in=students)
        results_map = {} # (student_id, assessment_id) -> result
        for r in results:
            results_map[(r.student_id, r.assessment_id)] = r

        # 4. Construct response
        response_data = {
            'assessments': [
                {
                    'id': a.assessment_id,
                    'title': a.title,
                    'total_marks': a.total_marks,
                    'type': a.type
                } for a in assessments
            ],
            'students': []
        }

        for s in students:
            student_results = {}
            for a in assessments:
                result = results_map.get((s.id, a.assessment_id))
                student_results[str(a.assessment_id)] = {
                    'score': result.score if result else None,
                    'result_id': result.result_id if result else None,
                    'submitted_at': result.submitted_at if result else None
                }
            
            response_data['students'].append({
                'id': s.id,
                'name': s.user.get_full_name(),
                'email': s.user.email,
                'results': student_results
            })

        return Response(response_data)

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Question.objects.select_related('assessment', 'assessment__academic_year').all()
        requested_year, has_year_filter = _resolve_request_year(self.request)
        if has_year_filter and not requested_year:
            return queryset.none()
        if requested_year:
            queryset = queryset.filter(assessment__academic_year=requested_year)

        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        return queryset.order_by('order')

class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Submission.objects.select_related('assessment', 'assessment__academic_year', 'student').all()
        requested_year, has_year_filter = _resolve_request_year(self.request)
        if has_year_filter and not requested_year:
            return queryset.none()
        if requested_year:
            queryset = queryset.filter(assessment__academic_year=requested_year)

        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        
        # If student, only show their own submissions
        try:
            student = Student.objects.get(user=self.request.user)
            queryset = queryset.filter(student=student)
        except Student.DoesNotExist:
            pass
            
        return queryset

    @action(detail=False, methods=['post'])
    def submit_exam(self, request):
        """
        Submit a quiz/exam. Handles automatic grading for MCQs.
        """
        assessment_id = request.data.get('assessment')
        answers = request.data.get('answers', {}) # { question_id: answer }
        time_taken = request.data.get('time_taken', 0)

        try:
            assessment_qs = Assessment.objects.filter(assessment_id=assessment_id)
            requested_year, has_year_filter = _resolve_request_year(request)
            if has_year_filter and not requested_year:
                return Response({'error': 'Academic year not found'}, status=status.HTTP_400_BAD_REQUEST)
            if requested_year:
                assessment_qs = assessment_qs.filter(academic_year=requested_year)
            assessment = assessment_qs.get()
            student = Student.objects.get(user=request.user)
        except (Assessment.DoesNotExist, Student.DoesNotExist):
            return Response({'error': 'Invalid assessment or student'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Create Submission
        submission, created = Submission.objects.update_or_create(
            assessment=assessment,
            student=student,
            defaults={'status': 'submitted'}
        )

        # 2. Use Grading Service
        total_score, max_possible, graded_answers = GradingService.grade_submission(assessment, answers)
        
        # 3. Create Result
        result, _ = Result.objects.update_or_create(
            assessment=assessment,
            student=student,
            defaults={
                'score': total_score,
                'time_taken_minutes': time_taken,
                'answers_data': graded_answers
            }
        )

        # Award gamification rewards
        try:
            from gamification.services.gamification_service import GamificationService
            GamificationService.on_assessment_complete(student, result)
        except ImportError:
            pass

        return Response({
            'score': total_score,
            'max_score': max_possible,
            'result_id': result.result_id
        })

    @action(detail=True, methods=['post'])
    def grade(self, request, pk=None):
        """
        Manually grade a submission (Teacher only).
        """
        submission = self.get_object()
        score = request.data.get('score')
        feedback = request.data.get('feedback')
        status_val = request.data.get('status', 'graded')
        
        # Update Result
        result = Result.objects.filter(assessment=submission.assessment, student=submission.student).first()
        if not result:
            # Create if missing
            result = Result.objects.create(
                assessment=submission.assessment, 
                student=submission.student, 
                score=score or 0
            )
        
        if score is not None:
            result.score = int(score)
        if feedback:
            result.teacher_feedback = feedback
        result.save()
        
        # Update Submission Status
        if hasattr(submission, 'status'):
            submission.status = status_val
            submission.save()

        # Award/Update gamification rewards
        try:
            from gamification.services.gamification_service import GamificationService
            GamificationService.on_assessment_complete(submission.student, result)
        except ImportError:
            pass
            
        return Response({'status': 'graded', 'score': result.score})

    @action(detail=True, methods=['post'])
    def ai_grade(self, request, pk=None):
        """
        Trigger AI grading for a submission.
        """
        submission = self.get_object()
        assessment = submission.assessment
        
        # Get answers from Result if available, or request data
        result = Result.objects.filter(assessment=assessment, student=submission.student).first()
        answers = {}
        if result and result.answers_data:
            # Extract answers from existing result
            for q_id, data in result.answers_data.items():
                answers[q_id] = data.get('answer')
        
        # Re-run grading with AI
        total_score, max_possible, graded_answers = GradingService.grade_submission(assessment, answers)
        
        # Update/Create Result
        if not result:
            result = Result.objects.create(
                assessment=assessment,
                student=submission.student,
                score=total_score,
                answers_data=graded_answers
            )
        else:
            result.score = total_score
            result.answers_data = graded_answers
            result.save()

        # Award/Update gamification rewards
        try:
            from gamification.services.gamification_service import GamificationService
            GamificationService.on_assessment_complete(submission.student, result)
        except ImportError:
            pass
            
        return Response({
            'score': total_score,
            'max_score': max_possible,
            'graded_answers': graded_answers
        })

class ResultViewSet(viewsets.ModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Result.objects.select_related('assessment', 'assessment__academic_year', 'student', 'student__user').all()
        requested_year, has_year_filter = _resolve_request_year(self.request)
        if has_year_filter and not requested_year:
            return queryset.none()
        if requested_year:
            queryset = queryset.filter(assessment__academic_year=requested_year)

        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
            
        # Teacher/Admin can see everything
        if getattr(self.request.user, 'role', None) in ['teacher', 'admin', 'saas_admin']:
            return queryset

        # Students only see their own
        try:
            student = Student.objects.get(user=self.request.user)
            queryset = queryset.filter(student=student)
        except Student.DoesNotExist:
            queryset = queryset.none()
            
        return queryset

    @action(detail=True, methods=['post'])
    def generate_ai_feedback(self, request, pk=None):
        """
        Generates qualitative AI feedback for this result.
        """
        result = self.get_object()
        
        # Initialize AI Feedbacker
        try:
            from ai_engine.services.tutor_service import ai_tutor_service
            
            # Construct a prompt based on result data
            prompt = f"""
            Analyze the following student performance and provide a constructive summary.
            Student: {result.student.user.get_full_name()}
            Assessment: {result.assessment.title}
            Score: {result.score} / {result.assessment.total_marks}
            Time Taken: {result.time_taken_minutes} minutes
            
            Answer Breakdown:
            {json.dumps(result.answers_data, indent=2)}
            
            Provide:
            1. What they did well.
            2. Areas for improvement.
            3. A supportive general comment.
            Keep it encouraging and professional.
            """
            
            ai_response = ai_tutor_service.get_chat_response([{"role": "user", "content": prompt}])
            result.ai_feedback = ai_response
            result.save()
            
            return Response({'ai_feedback': ai_response})
        except Exception as e:
            # Fallback feedback if AI provider is unavailable
            try:
                percent = 0
                if result.assessment.total_marks:
                    percent = float(result.score or 0) / float(result.assessment.total_marks) * 100
                if percent >= 85:
                    message = "Strong performance. Keep practicing advanced questions to maintain this level."
                elif percent >= 60:
                    message = "Good progress. Review missed concepts and reattempt similar questions for better retention."
                else:
                    message = "Keep going. Revisit foundational concepts first, then practice short, focused question sets."
                result.ai_feedback = message
            except Exception:
                result.ai_feedback = "Good effort. Review core concepts and practice similar questions to improve your next attempt."
            result.save()
            return Response({'ai_feedback': result.ai_feedback, 'error': str(e)})

    def perform_update(self, serializer):
        # Track who graded it if the user is a teacher/admin
        if getattr(self.request.user, 'role', None) in ['teacher', 'admin', 'saas_admin']:
            serializer.save(graded_by=self.request.user)
        else:
            serializer.save()
