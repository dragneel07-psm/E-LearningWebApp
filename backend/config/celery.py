from __future__ import annotations

import os

try:
    from celery import Celery
except Exception:
    class Celery:  # type: ignore[override]
        def __init__(self, *_args, **_kwargs):
            self.name = "config"

        def config_from_object(self, *_args, **_kwargs):
            return None

        def autodiscover_tasks(self, *_args, **_kwargs):
            return None

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
