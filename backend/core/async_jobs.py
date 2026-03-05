from __future__ import annotations

import logging
from typing import Any, Callable

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from celery import shared_task as celery_shared_task  # type: ignore

    CELERY_AVAILABLE = True
except Exception:
    celery_shared_task = None
    CELERY_AVAILABLE = False


def _async_backend() -> str:
    return str(getattr(settings, "ASYNC_TASK_BACKEND", "sync") or "sync").strip().lower()


def background_task(*task_args, **task_kwargs):
    """
    Registers a task for optional Celery execution.
    Falls back to direct function calls when Celery is unavailable.
    """

    def decorator(func: Callable[..., Any]):
        if CELERY_AVAILABLE and celery_shared_task is not None:
            task_obj = celery_shared_task(*task_args, **task_kwargs)(func)
        else:
            task_obj = func

            def _sync_delay(*args, **kwargs):
                return func(*args, **kwargs)

            setattr(task_obj, "delay", _sync_delay)

        setattr(task_obj, "__sync_callable__", func)
        return task_obj

    return decorator


def enqueue(task: Callable[..., Any], *args, **kwargs):
    """
    Execute a task asynchronously when configured and available;
    otherwise execute synchronously.
    """
    backend = _async_backend()
    if backend == "celery" and CELERY_AVAILABLE and hasattr(task, "delay"):
        return task.delay(*args, **kwargs)

    if backend == "celery" and not CELERY_AVAILABLE:
        logger.warning("Celery backend requested but Celery is unavailable; executing task synchronously.")

    sync_callable = getattr(task, "__sync_callable__", None)
    if callable(sync_callable):
        return sync_callable(*args, **kwargs)
    return task(*args, **kwargs)

