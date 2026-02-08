import json
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

    @action(detail=False, methods=['get'])
    def gradebook(self, request):
        """
        Returns a matrix of students and their assessment scores for a subject.
        """
        subject_id = request.query_params.get('subject')
        if not subject_id:
            return Response({'error': 'subject_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Get all assessments for this subject
        assessments = Assessment.objects.filter(subject_id=subject_id).order_by('scheduled_at', 'created_at')
        if not assessments.exists():
            # Still get students even if no assessments? 
            # Better to get students from the subject relation. 
            pass

        # 2. Get students enrolled in this subject's class/section
        # Assuming subjects belong to a class and class has students
        from academic.models.subject import Subject
        try:
            subject = Subject.objects.get(id=subject_id)
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
        queryset = Result.objects.all()
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
            from ai_engine.services.tutor_service import tutor_service
            
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
            
            ai_response = tutor_service.generate_response(prompt)
            result.ai_feedback = ai_response
            result.save()
            
            return Response({'ai_feedback': ai_response})
        except Exception as e:
            # Fallback mock if AI fails
            result.ai_feedback = "Good effort! Focus on reviewing the core concepts of this assessment to improve your score next time."
            result.save()
            return Response({'ai_feedback': result.ai_feedback, 'error': str(e)})

    def perform_update(self, serializer):
        # Track who graded it if the user is a teacher/admin
        if getattr(self.request.user, 'role', None) in ['teacher', 'admin', 'saas_admin']:
            serializer.save(graded_by=self.request.user)
        else:
            serializer.save()
