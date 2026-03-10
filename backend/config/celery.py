from __future__ import annotations

import os

try:
    from celery import Celery
    from celery.schedules import crontab
except Exception:
    class Celery:  # type: ignore[override]
        def __init__(self, *_args, **_kwargs):
            self.name = "config"

        def config_from_object(self, *_args, **_kwargs):
            return None

        def autodiscover_tasks(self, *_args, **_kwargs):
            return None

    def crontab(*_args, **_kwargs):  # type: ignore[misc]
        return None

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks([
    "academic",
    "ai_engine",
    "billing",
    "billing_school",
    "hr_payroll",
    "notifications",
    "transport",
    "hostel",
])

try:
    app.conf.beat_schedule = {
        "send-fee-reminders": {
            "task": "billing_school.tasks.send_fee_due_reminders",
            "schedule": crontab(hour=8, minute=0),
        },
    }
except Exception:
    pass
