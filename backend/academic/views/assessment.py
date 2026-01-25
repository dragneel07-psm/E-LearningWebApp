from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from academic.models.assessment import Assessment, Result
from academic.models.question import Question
from academic.models.submission import Submission
from academic.models.student import Student
from academic.serializers.assessment import (
    AssessmentSerializer, QuestionSerializer, 
    SubmissionSerializer, ResultSerializer
)
from academic.services.grading_service import GradingService

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Assessment.objects.all()
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

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Question.objects.all()
        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        return queryset.order_by('order')

class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.all()
    serializer_class = SubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Submission.objects.all()
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
            assessment = Assessment.objects.get(assessment_id=assessment_id)
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

class ResultViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Result.objects.all()
        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
            
        try:
            student = Student.objects.get(user=self.request.user)
            queryset = queryset.filter(student=student)
        except Student.DoesNotExist:
            pass
            
        return queryset
