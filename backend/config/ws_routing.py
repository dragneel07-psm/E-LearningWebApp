from django.urls import re_path
from ai_engine.consumers import TutorStreamConsumer, ProgressReportStreamConsumer
from notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    re_path(r"^ws/tutor/chat/$", TutorStreamConsumer.as_asgi()),
    re_path(r"^ws/progress-report/$", ProgressReportStreamConsumer.as_asgi()),
    re_path(r"^ws/notifications/$", NotificationConsumer.as_asgi()),
]
