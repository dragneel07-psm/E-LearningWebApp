"""
ai_client — Model Fallback Chain (Phase 14).

Wraps OpenAI chat completion calls with automatic retry on a secondary
(cheaper/lighter) model when the primary model is unavailable due to
quota limits or transient errors.

Fallback order:
  1. Primary model  (from get_ai_provider_config() / OPENAI_MODEL env var)
  2. Fallback model (AI_FALLBACK_MODEL env var, default: gpt-4o-mini)

Usage:
  from ai_engine.services.ai_client import chat_with_fallback

  response = chat_with_fallback(
      messages=[{"role": "user", "content": "Hello"}],
      temperature=0.7,
  )
  answer = response.choices[0].message.content
"""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

# Errors that trigger a fallback (rate limits, quota, overload)
_RETRYABLE_STATUS_CODES = {429, 503, 529}


def chat_with_fallback(
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.7,
    response_format: dict | None = None,
    max_tokens: int | None = None,
    timeout: float | None = None,
) -> Any:
    """
    Call the configured AI provider for a chat completion.

    Automatically retries with the fallback model if the primary model
    returns a rate-limit or service-unavailable error.

    Returns an OpenAI ChatCompletion response object.
    Raises the last exception if all models fail.
    """
    from openai import OpenAI, RateLimitError, APIStatusError

    from ai_engine.services.provider_config import get_ai_provider_config

    config = get_ai_provider_config()
    primary_model = str(config.get("model") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"))
    fallback_model = str(getattr(settings, "AI_FALLBACK_MODEL", "gpt-4o-mini"))

    client = OpenAI(
        api_key=config.get("api_key"),
        base_url=config.get("base_url"),
        default_headers=config.get("request_headers") or None,
        timeout=timeout or float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
    )

    call_kwargs: dict[str, Any] = {"messages": messages, "temperature": temperature}
    if response_format:
        call_kwargs["response_format"] = response_format
    if max_tokens:
        call_kwargs["max_tokens"] = max_tokens

    models_to_try = _build_model_chain(primary_model, fallback_model)
    last_exc: Exception | None = None

    for model in models_to_try:
        try:
            response = client.chat.completions.create(model=model, **call_kwargs)
            if model != primary_model:
                logger.info("ai_client: used fallback model '%s'", model)
            return response
        except RateLimitError as exc:
            logger.warning("ai_client: rate-limit on '%s', trying next model: %s", model, exc)
            last_exc = exc
        except APIStatusError as exc:
            if exc.status_code in _RETRYABLE_STATUS_CODES:
                logger.warning(
                    "ai_client: status %s on '%s', trying next model: %s",
                    exc.status_code, model, exc,
                )
                last_exc = exc
            else:
                raise
        except Exception:
            raise

    raise last_exc  # type: ignore[misc]


def stream_with_fallback(
    messages: list[dict[str, Any]],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    timeout: float | None = None,
) -> Any:
    """
    Like chat_with_fallback but with stream=True.

    Returns a streaming response object. Fallback fires only if the
    primary model raises an error *before* any tokens are received
    (e.g. at connection/quota check time), which is the common case
    for rate-limit errors.
    """
    from openai import OpenAI, RateLimitError, APIStatusError

    from ai_engine.services.provider_config import get_ai_provider_config

    config = get_ai_provider_config()
    primary_model = str(config.get("model") or getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"))
    fallback_model = str(getattr(settings, "AI_FALLBACK_MODEL", "gpt-4o-mini"))

    client = OpenAI(
        api_key=config.get("api_key"),
        base_url=config.get("base_url"),
        default_headers=config.get("request_headers") or None,
        timeout=timeout or float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 30)),
    )

    call_kwargs: dict[str, Any] = {"messages": messages, "temperature": temperature, "stream": True}
    if max_tokens:
        call_kwargs["max_tokens"] = max_tokens

    models_to_try = _build_model_chain(primary_model, fallback_model)
    last_exc: Exception | None = None

    for model in models_to_try:
        try:
            stream = client.chat.completions.create(model=model, **call_kwargs)
            if model != primary_model:
                logger.info("ai_client: used fallback model '%s' for streaming", model)
            return stream
        except RateLimitError as exc:
            logger.warning("ai_client: rate-limit on '%s' (stream), trying next model: %s", model, exc)
            last_exc = exc
        except APIStatusError as exc:
            if exc.status_code in _RETRYABLE_STATUS_CODES:
                logger.warning(
                    "ai_client: status %s on '%s' (stream), trying next model: %s",
                    exc.status_code, model, exc,
                )
                last_exc = exc
            else:
                raise
        except Exception:
            raise

    raise last_exc  # type: ignore[misc]


def _build_model_chain(primary: str, fallback: str) -> list[str]:
    """Return deduplicated list of models to try in order."""
    chain = [primary]
    if fallback and fallback != primary:
        chain.append(fallback)
    return chain
