from __future__ import annotations

import json
from typing import Any

from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context

from core.async_jobs import background_task
from core.models import Tenant

from .models import AIInteractionLog
from .services.indexing_service import index_raw_content
from .services.tutor_service import AITutorService


def _tenant_schema(value: str | None) -> str:
    schema = str(value or "").strip().lower()
    return schema or "public"


def _resolve_tenant(schema_name: str) -> Tenant | None:
    with schema_context("public"):
        return Tenant.objects.filter(schema_name=schema_name).first()


def _resolve_user(user_id: str | None):
    if not user_id:
        return None
    user_model = get_user_model()
    return user_model.objects.filter(pk=user_id).first()


def _as_json_dict(text: str) -> dict[str, Any] | None:
    if not isinstance(text, str) or not text.strip():
        return None
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def _as_json_list(text: str) -> list[dict[str, Any]] | None:
    if not isinstance(text, str) or not text.strip():
        return None
    try:
        value = json.loads(text)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    except Exception:
        return None
    return None


def _fallback_quiz(content: str, question_count: int) -> list[dict[str, Any]]:
    sanitized = (content or "").strip()
    if not sanitized:
        sanitized = "the provided lesson"
    capped = max(1, min(int(question_count or 5), 10))
    return [
        {
            "question": f"What is a key concept from {sanitized[:80]}?",
            "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
            "answer": "Concept A",
            "explanation": "Review the lesson summary and identify the main concept.",
        }
        for _ in range(capped)
    ]


@background_task(name="ai.index_content")
def ai_index_content_task(
    *,
    tenant_schema: str,
    content: str,
    metadata: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> dict[str, Any]:
    schema_name = _tenant_schema(tenant_schema)
    payload = metadata or {}
    source_type = str(payload.get("source_type") or "material").strip().lower()
    source_id = str(payload.get("source_id") or "adhoc-content").strip()

    result = index_raw_content(
        tenant_schema=schema_name,
        source_type=source_type,
        source_id=source_id,
        text=content,
        metadata=payload,
    )

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        user = _resolve_user(user_id)
        if tenant:
            AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used="content_index",
                total_tokens=0,
            )

    result["tenant_schema"] = schema_name
    return result


@background_task(name="ai.generate_summary")
def generate_summary_task(
    *,
    tenant_schema: str,
    content: str,
    max_points: int = 5,
    user_id: str | None = None,
) -> dict[str, Any]:
    schema_name = _tenant_schema(tenant_schema)
    body = str(content or "").strip()
    capped_points = max(3, min(int(max_points or 5), 10))
    tutor = AITutorService()

    prompt = (
        "Summarize the following study content for a student. "
        f"Return strict JSON only with keys: summary (string), bullet_points (array of max {capped_points} strings). "
        f"Content: {body}"
    )
    response = tutor.generate_response(prompt)
    parsed = _as_json_dict(response) or {}
    bullet_points = parsed.get("bullet_points")
    if not isinstance(bullet_points, list):
        bullet_points = []

    if not parsed.get("summary"):
        parsed["summary"] = body[:320] if body else "No content provided."
    parsed["bullet_points"] = [str(item) for item in bullet_points[:capped_points]]
    parsed["model"] = tutor.model

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        user = _resolve_user(user_id)
        if tenant:
            AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used="summary_generation",
                total_tokens=0,
            )

    return parsed


@background_task(name="ai.generate_quiz")
def generate_quiz_task(
    *,
    tenant_schema: str,
    content: str,
    question_count: int = 5,
    user_id: str | None = None,
) -> dict[str, Any]:
    schema_name = _tenant_schema(tenant_schema)
    body = str(content or "").strip()
    capped_count = max(1, min(int(question_count or 5), 10))
    tutor = AITutorService()

    prompt = (
        "Generate a student quiz as strict JSON array. "
        "Each item must include keys: question, options (4 strings), answer, explanation. "
        f"Create {capped_count} questions from: {body}"
    )
    response = tutor.generate_response(prompt)
    questions = _as_json_list(response)
    if not questions:
        questions = _fallback_quiz(body, capped_count)
    if len(questions) > capped_count:
        questions = questions[:capped_count]

    with schema_context(schema_name):
        tenant = _resolve_tenant(schema_name)
        user = _resolve_user(user_id)
        if tenant:
            AIInteractionLog.objects.create(
                tenant=tenant,
                user=user,
                feature_used="quiz_generation",
                total_tokens=0,
            )

    return {
        "question_count": len(questions),
        "questions": questions,
        "model": tutor.model,
    }
