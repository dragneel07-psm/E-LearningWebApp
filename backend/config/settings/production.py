from .base import *  # noqa: F401, F403

import os

DEBUG = False

# ── Security ──────────────────────────────────────────────────────────────────
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "true").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000          # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

# ── Database connection pooling ───────────────────────────────────────────────
# Keep connections alive for 60s — avoids reconnect overhead on every request.
# Django's default is 0 (new connection per request).
DATABASES["default"]["CONN_MAX_AGE"] = int(os.environ.get("CONN_MAX_AGE", "60"))  # noqa: F405
DATABASES["default"]["OPTIONS"] = {  # noqa: F405
    "connect_timeout": 10,
    "options": "-c default_transaction_isolation=read committed",
}

# ── Caching ───────────────────────────────────────────────────────────────────
# Use Redis for full Django cache (sessions, rate limits, template fragments)
_REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "elms",
        "TIMEOUT": 300,
    }
}
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_TASK_ALWAYS_EAGER = False        # never run tasks inline in production
CELERY_WORKER_PREFETCH_MULTIPLIER = 1   # fair dispatch — important for long AI tasks
CELERY_TASK_ACKS_LATE = True            # re-queue on crash instead of losing task
CELERY_TASK_REJECT_ON_WORKER_LOST = True

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
        "simple": {
            "format": "[%(levelname)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if os.environ.get("LOG_JSON", "false") == "true" else "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("LOG_LEVEL", "WARNING"),
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "ai_engine": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# ── Static files ──────────────────────────────────────────────────────────────
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"
