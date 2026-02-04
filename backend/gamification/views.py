from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Window, F
from django.db.models.functions import Rank
from .models import Badge, StudentBadge, PointTransaction
from .serializers import (
    BadgeSerializer, StudentBadgeSerializer, 
    PointTransactionSerializer, LeaderboardEntrySerializer
)
from academic.models import Student
from core.mixins import TenantScopedQuerysetMixin

class StudentBadgeViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = StudentBadge.objects.all()
    serializer_class = StudentBadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = 'tenant'

    def get_queryset(self):
        qs = super().get_queryset()
        # If student, show only their badges
        try:
            student = Student.objects.get(user=self.request.user)
            return qs.filter(student=student)
        except Student.DoesNotExist:
            return qs

class LeaderboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """
        Get the leaderboard. Supports ?scope=class (default) or ?scope=school.
        Respects is_public=True on GamificationProfile.
        """
        try:
            current_student = Student.objects.get(user=request.user)
            scope = request.query_params.get('scope', 'class')
            period = request.query_params.get('period', 'all_time') # future extension

            # 1. Fetch relevant student IDs based on scope (TENANT DB)
            if scope == 'school':
                student_qs = Student.objects.all().values('student_id', 'user__first_name', 'user__last_name')
            else:
                # Default to class
                if not current_student.academic_class:
                     return Response({'error': 'Student not assigned to a class'}, status=400)
                student_qs = Student.objects.filter(academic_class=current_student.academic_class) \
                    .values('student_id', 'user__first_name', 'user__last_name')

            # Create a map for quick lookup: {student_id: "Name"}
            student_map = {str(s['student_id']): f"{s['user__first_name']} {s['user__last_name']}" for s in student_qs}
            student_ids = list(student_map.keys())

            # 2. Fetch aggregation from GamificationProfile (SHARED DB)
            # Filter by matching student IDs and is_public=True
            # Note: We can't join, so we filter by ID list.
            profiles = GamificationProfile.objects.filter(
                student_id__in=student_ids, 
                is_public=True
            ).order_by('-total_xp')[:50]

            results = []
            rank = 1
            for profile in profiles:
                # Double check if student exists in our map (integrity)
                s_name = student_map.get(str(profile.student_id))
                if s_name:
                    results.append({
                        'student_id': profile.student_id,
                        'student_name': s_name,
                        'total_points': profile.total_xp,
                        'current_level': profile.current_level,
                        'badges_count': 0, # Fetching badges count would be another query. Skip for perf or do separate agg.
                        'rank': rank
                    })
                    rank += 1

            # 3. Handle "My Rank" if not in top 50?
            # Optional: Add current user's rank separately if needed.

            return Response(results)

        except Student.DoesNotExist:
            return Response({'error': 'Leaderboard only available for students'}, status=403)

class BadgeViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = 'tenant'

from .models import GamificationProfile
from .serializers import GamificationProfileSerializer
from .services.gamification_service import GamificationService

class GamificationProfileViewSet(viewsets.ModelViewSet):
    serializer_class = GamificationProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return GamificationProfile.objects.filter(student__user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        try:
            student = Student.objects.get(user=request.user)
            profile = GamificationService.get_or_create_profile(student)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({'error': 'Not a student'}, status=403)
