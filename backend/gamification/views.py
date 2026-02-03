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
        Get the leaderboard for the current class.
        """
        try:
            current_student = Student.objects.get(user=request.user)
            academic_class = current_student.academic_class
            
            if not academic_class:
                return Response({'error': 'Student not assigned to a class'}, status=400)

            # Aggregate points and badge counts per student in the same class
            # We use select_related('user') to optimize and also to inadvertently filter out orphaned students (INNER JOIN)
            leaderboard_data = Student.objects.filter(academic_class=academic_class).select_related('user').annotate(
                total_points=Sum('points__points'),
                badges_count=Count('badges', distinct=True)
            ).order_by('-total_points')[:50]

            results = []
            for i, student in enumerate(leaderboard_data):
                results.append({
                    'student_id': student.student_id,
                    'student_name': f"{student.user.first_name} {student.user.last_name}",
                    'total_points': student.total_points or 0,
                    'badges_count': student.badges_count or 0,
                    'rank': i + 1
                })

            serializer = LeaderboardEntrySerializer(results, many=True)
            return Response(serializer.data)

        except Student.DoesNotExist:
            return Response({'error': 'Leaderboard only available for students'}, status=403)

class BadgeViewSet(TenantScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]
    tenant_field = 'tenant'
