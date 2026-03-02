import os
from typing import Any, Dict

from core.models import GlobalSettings


DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-3.5-turbo"


def _infer_provider_name(base_url: str) -> str:
    lowered = (base_url or "").lower()
    if "openrouter.ai" in lowered:
        return "OpenRouter"
    if "openai.com" in lowered:
        return "OpenAI"
    return "Custom OpenAI-Compatible"


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}...{key[-4:]}"


def get_ai_provider_config() -> Dict[str, Any]:
    env_base_url = (os.getenv("OPENAI_BASE_URL") or DEFAULT_BASE_URL).strip().rstrip("/")
    env_model = (os.getenv("OPENAI_MODEL") or DEFAULT_MODEL).strip()
    env_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    env_provider = (os.getenv("OPENAI_PROVIDER_NAME") or "").strip()

    settings_obj = None
    try:
        settings_obj = GlobalSettings.objects.first()
    except Exception:
        settings_obj = None

    source = "environment"
    enabled = True

    if settings_obj:
        db_provider = (settings_obj.ai_provider_name or "").strip()
        db_base_url = (settings_obj.ai_base_url or "").strip().rstrip("/")
        db_model = (settings_obj.ai_model or "").strip()
        db_key = (settings_obj.ai_api_key or "").strip()

        provider_name = db_provider or env_provider or _infer_provider_name(db_base_url or env_base_url)
        base_url = db_base_url or env_base_url
        model = db_model or env_model
        api_key = db_key or env_key
        enabled = bool(settings_obj.ai_enabled)
        source = "saas_settings"
    else:
        base_url = env_base_url
        model = env_model
        api_key = env_key
        provider_name = env_provider or _infer_provider_name(base_url)

    configured = bool(api_key and api_key != "demo-key")

    return {
        "provider_name": provider_name,
        "base_url": base_url,
        "model": model,
        "api_key": api_key,
        "api_key_masked": _mask_key(api_key),
        "configured": configured,
        "enabled": enabled,
        "source": source,
    }
