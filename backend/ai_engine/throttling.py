from rest_framework.throttling import ScopedRateThrottle


class TutorChatRateThrottle(ScopedRateThrottle):
    scope = "ai_tutor_chat"
