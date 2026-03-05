"""
Config package bootstrap.
Imports Celery app when available without breaking environments
where Celery is not installed yet.
"""

try:
    from .celery import app as celery_app

    __all__ = ("celery_app",)
except Exception:
    celery_app = None
    __all__ = ()
