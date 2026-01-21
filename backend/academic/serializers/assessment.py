from rest_framework import serializers
from academic.models.assessment import Assessment, Result
from academic.models.question import Question
from academic.models.submission import Submission

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['question_id', 'assessment', 'text', 'type', 'options', 'correct_answer', 'points', 'order']

class AssessmentSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Assessment
        fields = [
            'assessment_id', 'subject', 'title', 'description', 'type', 
            'total_marks', 'passing_marks', 'scheduled_at', 'due_date', 
            'duration_minutes', 'blooms_level', 'questions'
        ]

class SubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    
    class Meta:
        model = Submission
        fields = [
            'submission_id', 'assessment', 'student', 'student_name', 
            'content', 'file_url', 'submitted_at', 'status', 'is_graded'
        ]

class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    assessment_title = serializers.CharField(source='assessment.title', read_only=True)
    
    class Meta:
        model = Result
        fields = [
            'result_id', 'assessment', 'assessment_title', 'student', 'student_name', 
            'score', 'time_taken_minutes', 'submitted_at', 'ai_feedback', 
            'teacher_feedback', 'answers_data'
        ]
