# AI Tutor Chat Endpoint (RAG)

## Endpoint

- `POST /api/ai/tutor/chat/`

Request body:

```json
{
  "message": "Explain Newton's first law",
  "context": {
    "lesson_id": "lesson-1",
    "chapter_id": "chapter-1"
  }
}
```

Response body:

```json
{
  "answer": "Newton's first law means ...",
  "sources": [
    {
      "source_type": "lesson",
      "source_id": "lesson-1",
      "snippet": "Newton's first law states..."
    }
  ],
  "usage": {
    "model": "gpt-4o-mini",
    "prompt_tokens": 42,
    "completion_tokens": 18
  }
}
```

## Behavior

- Uses tenant-scoped `ContentChunk` rows for retrieval.
- Embeds user message and retrieves top-k by cosine similarity.
- Prompt includes:
  - strict system rules (no hallucination, grounded answers only)
  - tenant/school tone context
  - retrieved snippets
- If similarity is below threshold, response falls back to:
  - `"I’m not sure ..."` plus guidance on what to ask next.

## Security + Isolation

- Endpoint requires authenticated user.
- Throttled via DRF scoped throttle:
  - scope: `ai_tutor_chat`
  - default rate: `30/min` (`THROTTLE_AI_TUTOR_CHAT`)
- Tenant isolation is enforced by:
  - resolved tenant schema in middleware
  - tenant-aware `ContentChunk` query filter (`tenant=<request tenant>`)

## Config

Environment keys:

- `AI_TUTOR_TOP_K` (default `5`)
- `AI_TUTOR_MIN_SIMILARITY` (default `0.58`)
- `THROTTLE_AI_TUTOR_CHAT` (default `30/min`)

## Frontend Integration

- `frontend/lib/api.ts` `aiAPI.chat(...)` now maps the RAG response.
- Backward-compatible fields are still returned to current UI calls:
  - `response` alias of `answer`
  - `tokens_used` derived from usage
- Student tutor UI (`frontend/app/student/ai-tutor/page.tsx`) now renders source snippets and model/token usage.

## Tests

- Added API regression test:
  - `backend/ai_engine/tests_tutor_api.py`
- Test creates tenant chunk data, mocks LLM call, and verifies:
  - `200 OK`
  - `answer`, `sources`, and `usage` keys are present
  - source metadata is returned as expected
