from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentBadgeViewSet, LeaderboardViewSet, BadgeViewSet

router = DefaultRouter()
router.register(r'student-badges', StudentBadgeViewSet, basename='student-badges')
router.register(r'leaderboard', LeaderboardViewSet, basename='leaderboard')
router.register(r'available-badges', BadgeViewSet, basename='available-badges')

urlpatterns = [
    path('', include(router.urls)),
]
