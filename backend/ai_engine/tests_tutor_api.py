from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient

from ai_engine.models import ContentChunk

User = get_user_model()


class TutorChatApiTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tutor API School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="rag_student",
                email="rag_student@example.com",
                password="RagStudent@123",
                role="student",
                tenant=self.tenant,
            )
            ContentChunk.objects.create(
                tenant=self.tenant,
                source_type="lesson",
                source_id="lesson-1",
                text="Newton's first law states that an object remains at rest or in uniform motion unless acted upon by a net force.",
                metadata={"lesson_id": "lesson-1", "chapter_id": "chapter-1"},
                embedding=[0.01] * dimensions,
            )

        self.client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        self.client.force_authenticate(user=self.user)

    @override_settings(AI_TUTOR_MIN_SIMILARITY=-1.0)
    @patch("ai_engine.services.rag_tutor_service.RAGTutorService._call_chat_model")
    def test_tutor_chat_returns_answer_sources_and_usage(self, mock_call_chat_model):
        mock_call_chat_model.return_value = (
            "Newton's first law means objects keep their current motion unless a force changes it.",
            {
                "model": "gpt-4o-mini",
                "prompt_tokens": 42,
                "completion_tokens": 18,
            },
        )

        dimensions = max(1, int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536)))
        with patch(
            "ai_engine.services.rag_tutor_service.RAGTutorService._embed_query",
            return_value=[0.01] * dimensions,
        ):
            response = self.client.post(
                "/api/ai/tutor/chat/",
                {
                    "message": "Explain Newton's first law.",
                    "context": {"lesson_id": "lesson-1", "chapter_id": "chapter-1"},
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("answer", response.data)
        self.assertIn("sources", response.data)
        self.assertIn("usage", response.data)
        self.assertTrue(response.data["answer"])
        self.assertGreaterEqual(len(response.data["sources"]), 1)
        self.assertEqual(response.data["sources"][0]["source_type"], "lesson")
        self.assertEqual(response.data["sources"][0]["source_id"], "lesson-1")
        self.assertEqual(response.data["usage"]["model"], "gpt-4o-mini")
        self.assertEqual(response.data["usage"]["prompt_tokens"], 42)
        self.assertEqual(response.data["usage"]["completion_tokens"], 18)

    @patch("ai_engine.services.rag_tutor_service.RAGTutorService.retrieve_relevant_chunks", return_value=[])
    @patch("ai_engine.services.rag_tutor_service.RAGTutorService._call_chat_model")
    def test_tutor_chat_uses_general_answer_when_no_grounding_context_is_requested(
        self,
        mock_call_chat_model,
        _mock_retrieve_relevant_chunks,
    ):
        mock_call_chat_model.return_value = (
            "Here is a quick Grade 10 algebra quiz outline with five questions and an answer key.",
            {
                "model": "gpt-4o-mini",
                "prompt_tokens": 30,
                "completion_tokens": 20,
            },
        )

        response = self.client.post(
            "/api/ai/tutor/chat/",
            {
                "message": "Generate a 5-question multiple choice quiz on Algebra for Grade 10 with answers.",
                "conversation_history": [
                    {"role": "user", "content": "I need a classroom-ready quiz."},
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("answer", response.data)
        self.assertNotIn("I’m not sure from the available context.", response.data["answer"])
        self.assertEqual(response.data["usage"]["model"], "gpt-4o-mini")
        self.assertEqual(response.data["sources"], [])
        self.assertFalse(response.data["is_demo"])
        self.assertEqual(response.data["fallback_reason"], "general_llm")
