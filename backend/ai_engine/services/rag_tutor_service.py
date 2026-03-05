from __future__ import annotations

import hashlib
import logging
import math
import random
from typing import Any

from django.conf import settings
from django.db.models import Q, QuerySet
from openai import OpenAI

from ai_engine.models import ContentChunk
from ai_engine.services.provider_config import get_ai_provider_config
from core.vector import PGVECTOR_AVAILABLE

try:
    from pgvector.django import CosineDistance
except Exception:
    CosineDistance = None


logger = logging.getLogger(__name__)


class RAGTutorService:
    def __init__(self, *, tenant):
        self.tenant = tenant
        self.config = get_ai_provider_config()
        self.model = str(self.config.get("model") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"))
        self.embedding_model = str(getattr(settings, "AI_EMBEDDING_MODEL", "text-embedding-3-small"))
        self.top_k = int(getattr(settings, "AI_TUTOR_TOP_K", 5))
        self.min_similarity = float(getattr(settings, "AI_TUTOR_MIN_SIMILARITY", 0.58))
        self.embedding_dimensions = int(getattr(settings, "AI_EMBEDDING_DIMENSIONS", 1536))

    def _openai_client(self):
        if not (self.config.get("enabled") and self.config.get("configured")):
            return None
        try:
            return OpenAI(
                api_key=self.config.get("api_key"),
                base_url=self.config.get("base_url"),
                default_headers=self.config.get("request_headers") or None,
                timeout=float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
            )
        except Exception as exc:
            logger.warning("Failed to initialize OpenAI client for tutor chat: %s", exc)
            return None

    def _normalize_vector(self, vector: list[float]) -> list[float]:
        if len(vector) > self.embedding_dimensions:
            return vector[: self.embedding_dimensions]
        if len(vector) < self.embedding_dimensions:
            return vector + [0.0] * (self.embedding_dimensions - len(vector))
        return vector

    def _stub_embedding(self, text: str) -> list[float]:
        seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
        rng = random.Random(seed)
        return [round(rng.uniform(-1.0, 1.0), 6) for _ in range(self.embedding_dimensions)]

    def _embed_query(self, message: str) -> list[float]:
        client = self._openai_client()
        if client:
            try:
                response = client.embeddings.create(model=self.embedding_model, input=message)
                embedding = list(response.data[0].embedding)
                return self._normalize_vector(embedding)
            except Exception as exc:
                logger.warning("Embedding generation failed; using stub embedding. Error: %s", exc)
        return self._stub_embedding(message)

    @staticmethod
    def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        if not vec_a or not vec_b:
            return -1.0
        n = min(len(vec_a), len(vec_b))
        if n == 0:
            return -1.0
        dot = sum(float(vec_a[i]) * float(vec_b[i]) for i in range(n))
        norm_a = math.sqrt(sum(float(vec_a[i]) ** 2 for i in range(n)))
        norm_b = math.sqrt(sum(float(vec_b[i]) ** 2 for i in range(n)))
        if norm_a == 0 or norm_b == 0:
            return -1.0
        return dot / (norm_a * norm_b)

    def _base_queryset(self, context: dict[str, Any] | None = None) -> QuerySet[ContentChunk]:
        queryset = ContentChunk.objects.filter(tenant=self.tenant)
        payload = context or {}

        lesson_id = payload.get("lesson_id")
        chapter_id = payload.get("chapter_id")
        source_type = str(payload.get("source_type") or "").strip().lower()
        source_id = payload.get("source_id")

        filters = Q()
        if lesson_id not in (None, ""):
            filters |= Q(source_type="lesson", source_id=str(lesson_id))
            filters |= Q(source_type="material", metadata__lesson_id=lesson_id)
        if chapter_id not in (None, ""):
            filters |= Q(source_type="chapter", source_id=str(chapter_id))
            filters |= Q(source_type="lesson", metadata__chapter_id=chapter_id)

        if filters:
            queryset = queryset.filter(filters)
        if source_type in {"lesson", "chapter", "material"}:
            queryset = queryset.filter(source_type=source_type)
        if source_id not in (None, ""):
            queryset = queryset.filter(source_id=str(source_id))
        return queryset

    def _retrieve_python(self, queryset: QuerySet[ContentChunk], query_vector: list[float]) -> list[tuple[ContentChunk, float]]:
        scored: list[tuple[ContentChunk, float]] = []
        for chunk in queryset[:500]:
            embedding = chunk.embedding
            if not isinstance(embedding, list) or not embedding:
                continue
            try:
                vector = [float(value) for value in embedding]
            except Exception:
                continue
            similarity = self._cosine_similarity(query_vector, vector)
            scored.append((chunk, similarity))
        return scored

    def retrieve_relevant_chunks(self, message: str, context: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        query_vector = self._embed_query(message)
        queryset = self._base_queryset(context)
        scored: list[tuple[ContentChunk, float]] = []

        if PGVECTOR_AVAILABLE and CosineDistance is not None:
            try:
                candidates = list(
                    queryset.annotate(distance=CosineDistance("embedding", query_vector))
                    .order_by("distance")[: max(self.top_k * 4, self.top_k)]
                )
                for row in candidates:
                    distance = float(getattr(row, "distance", 1.0) or 1.0)
                    similarity = 1.0 - distance
                    scored.append((row, similarity))
            except Exception as exc:
                logger.warning("pgvector cosine lookup failed; falling back to Python similarity: %s", exc)
                scored = self._retrieve_python(queryset, query_vector)
        else:
            scored = self._retrieve_python(queryset, query_vector)

        scored.sort(key=lambda item: item[1], reverse=True)
        return [
            {
                "chunk": chunk,
                "similarity": similarity,
            }
            for chunk, similarity in scored[: self.top_k]
        ]

    def _build_messages(self, message: str, snippets: list[dict[str, Any]]) -> list[dict[str, str]]:
        tenant_name = getattr(self.tenant, "name", "the school")
        rules = (
            "You are a careful school tutor assistant.\n"
            "Rules:\n"
            "1) Use only the provided snippets as factual grounding.\n"
            "2) If snippets are insufficient, explicitly say \"I’m not sure\".\n"
            "3) Be concise, clear, and teacher-friendly.\n"
            "4) Do not invent sources, facts, or citations.\n"
            f"5) Keep tone appropriate for {tenant_name} classroom culture."
        )
        context_block = "\n\n".join(
            [
                (
                    f"[Source {idx + 1}] type={item['chunk'].source_type} id={item['chunk'].source_id}\n"
                    f"{item['chunk'].text[:900]}"
                )
                for idx, item in enumerate(snippets)
            ]
        )
        user_prompt = (
            f"Question:\n{message}\n\n"
            f"Grounding snippets:\n{context_block}\n\n"
            "Answer using only the snippets. If uncertain, say \"I’m not sure\" and suggest what to ask next."
        )
        return [
            {"role": "system", "content": rules},
            {"role": "user", "content": user_prompt},
        ]

    def _call_chat_model(self, messages: list[dict[str, str]]) -> tuple[str, dict[str, Any]]:
        client = self._openai_client()
        if not client:
            return (
                "",
                {
                    "model": "fallback",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
            )

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.2,
                max_tokens=500,
            )
            content = response.choices[0].message.content or ""
            usage = getattr(response, "usage", None)
            return (
                content.strip(),
                {
                    "model": self.model,
                    "prompt_tokens": int(getattr(usage, "prompt_tokens", 0) or 0),
                    "completion_tokens": int(getattr(usage, "completion_tokens", 0) or 0),
                },
            )
        except Exception as exc:
            logger.warning("Tutor chat model call failed: %s", exc)
            return (
                "",
                {
                    "model": self.model,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
            )

    @staticmethod
    def _no_context_response(context: dict[str, Any] | None = None) -> str:
        payload = context or {}
        suggestions = []
        if payload.get("lesson_id"):
            suggestions.append("Ask about a specific concept from your lesson text")
        if payload.get("chapter_id"):
            suggestions.append("Ask about chapter definitions or worked examples")
        if not suggestions:
            suggestions.append("Ask with lesson or chapter context, e.g. key concept, summary, or example question")
        return f"I’m not sure from the available context. {suggestions[0]}."

    def answer_question(self, message: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        retrieved = self.retrieve_relevant_chunks(message, context=context)
        grounded = [item for item in retrieved if float(item["similarity"]) >= self.min_similarity]

        if not grounded:
            return {
                "answer": self._no_context_response(context),
                "sources": [],
                "usage": {
                    "model": "fallback-no-context",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                },
            }

        messages = self._build_messages(message, grounded)
        answer, usage = self._call_chat_model(messages)
        if not answer:
            answer = self._no_context_response(context)

        sources = [
            {
                "source_type": item["chunk"].source_type,
                "source_id": str(item["chunk"].source_id),
                "snippet": item["chunk"].text[:220],
            }
            for item in grounded
        ]
        return {
            "answer": answer,
            "sources": sources,
            "usage": usage,
        }
