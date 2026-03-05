from rest_framework import serializers
from .models import AIInteractionLog, StudentAIReport, LearningPath, LearningNode, StudyEvent, AiGeneratedArtifact, GradingRubric, AIGradingDraft

class StudyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyEvent
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

class AIInteractionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInteractionLog
        fields = '__all__'

class StudentAIReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAIReport
        fields = '__all__'

class LearningNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningNode
        fields = '__all__'
        read_only_fields = ['id', 'learning_path']

class LearningPathSerializer(serializers.ModelSerializer):
    nodes = LearningNodeSerializer(many=True, read_only=True)
    
    class Meta:
        model = LearningPath
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AiGeneratedArtifactSerializer(serializers.ModelSerializer):
    class Meta:
        model = AiGeneratedArtifact
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class LessonArtifactResponseSerializer(serializers.Serializer):
    summary = serializers.CharField()
    bullets = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    key_terms = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    practice_questions = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class QuizGenerationRequestSerializer(serializers.Serializer):
    source_type = serializers.ChoiceField(choices=["lesson", "chapter"])
    source_id = serializers.CharField()
    difficulty = serializers.ChoiceField(choices=["easy", "medium", "hard"])
    count = serializers.IntegerField(min_value=1, max_value=30)


class QuizGenerationQuestionSerializer(serializers.Serializer):
    question_id = serializers.CharField(required=False)
    type = serializers.ChoiceField(choices=["mcq"])
    prompt = serializers.CharField()
    options = serializers.ListField(child=serializers.CharField(), min_length=2)
    correct_index = serializers.IntegerField(min_value=0)
    explanation = serializers.CharField(allow_blank=True, required=False)


class QuizGenerationResponseSerializer(serializers.Serializer):
    quiz_id = serializers.CharField()
    questions = QuizGenerationQuestionSerializer(many=True)


class ExamDifficultyMixSerializer(serializers.Serializer):
    easy = serializers.IntegerField(min_value=0, max_value=100)
    medium = serializers.IntegerField(min_value=0, max_value=100)
    hard = serializers.IntegerField(min_value=0, max_value=100)

    def validate(self, attrs):
        if int(attrs["easy"]) + int(attrs["medium"]) + int(attrs["hard"]) != 100:
            raise serializers.ValidationError("difficulty_mix percentages must sum to 100.")
        return attrs


class ExamPaperGenerateRequestSerializer(serializers.Serializer):
    class_id = serializers.CharField()
    subject_id = serializers.CharField()
    units = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        required=False,
        default=list,
    )
    marks = serializers.IntegerField(min_value=10, max_value=300)
    difficulty_mix = ExamDifficultyMixSerializer()


class ExamPaperQuestionSerializer(serializers.Serializer):
    type = serializers.CharField()
    prompt = serializers.CharField()
    marks = serializers.IntegerField(min_value=1)
    options = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)


class ExamPaperSectionSerializer(serializers.Serializer):
    title = serializers.CharField()
    instructions = serializers.CharField(allow_blank=True, required=False)
    marks = serializers.IntegerField(min_value=1)
    questions = ExamPaperQuestionSerializer(many=True)


class ExamPaperSerializer(serializers.Serializer):
    title = serializers.CharField()
    total_marks = serializers.IntegerField(min_value=1)
    sections = ExamPaperSectionSerializer(many=True)


class ExamPaperGenerateResponseSerializer(serializers.Serializer):
    paper = ExamPaperSerializer()
    answer_key = serializers.JSONField()
    marking_scheme = serializers.JSONField()


class GradingRubricSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingRubric
        fields = [
            "id",
            "title",
            "criteria",
            "total_points",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class CreateGradingRubricSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    criteria = serializers.JSONField(required=False)
    total_points = serializers.IntegerField(min_value=1, max_value=1000)

    def validate_criteria(self, value):
        if value is None:
            return []
        if not isinstance(value, (list, dict)):
            raise serializers.ValidationError("criteria must be a list or object.")
        return value


class GradeSubmissionRequestSerializer(serializers.Serializer):
    submission_id = serializers.CharField()
    rubric_id = serializers.CharField()


class ApproveGradingDraftRequestSerializer(serializers.Serializer):
    draft_id = serializers.CharField()


class AIGradingDraftSerializer(serializers.ModelSerializer):
    submission_id = serializers.UUIDField(source="submission.submission_id", read_only=True)
    rubric_id = serializers.UUIDField(source="rubric.id", read_only=True)

    class Meta:
        model = AIGradingDraft
        fields = [
            "id",
            "submission_id",
            "rubric_id",
            "score",
            "feedback",
            "criteria_breakdown",
            "status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class GradeSubmissionDraftResponseSerializer(serializers.Serializer):
    draft_id = serializers.CharField()
    score = serializers.FloatField()
    feedback = serializers.CharField()
    criteria_breakdown = serializers.ListField(child=serializers.DictField(), allow_empty=True)
    status = serializers.CharField()


class AdminAssistantQueryRequestSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=2000)


class AdminAssistantQueryResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    data = serializers.JSONField()
    query_type = serializers.ChoiceField(choices=["attendance", "fees", "students", "performance", "overview"])


class ContentChunkSearchRequestSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=4000)
    top_k = serializers.IntegerField(min_value=1, max_value=20, required=False, default=5)
    min_similarity = serializers.FloatField(required=False, allow_null=True)
    context = serializers.DictField(required=False)
    source_type = serializers.ChoiceField(
        choices=["lesson", "chapter", "material"],
        required=False,
        allow_null=True,
    )
    source_id = serializers.CharField(required=False, allow_blank=False)

    def validate_context(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("context must be an object.")
        return value


class ContentChunkSearchResultSerializer(serializers.Serializer):
    chunk_id = serializers.UUIDField()
    source_type = serializers.ChoiceField(choices=["lesson", "chapter", "material"])
    source_id = serializers.CharField()
    text = serializers.CharField()
    metadata = serializers.JSONField()
    similarity = serializers.FloatField()


class ContentChunkSearchResponseSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = ContentChunkSearchResultSerializer(many=True)
