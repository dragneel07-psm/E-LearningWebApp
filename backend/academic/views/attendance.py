from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Attendance, Student
from ..serializers.academic import AttendanceSerializer
from core.mixins import TenantScopedQuerysetMixin

class AttendanceViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'student__user__tenant'

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # If student requesting, filter by their profile
        if hasattr(self.request.user, 'student_profile'):
             queryset = queryset.filter(student=self.request.user.student_profile)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
            
        return queryset

    @action(detail=False, methods=['get'])
    def my_attendance(self, request):
        """Get the current student's attendance records"""
        try:
            student = Student.objects.get(user=request.user)
            records = self.get_queryset().filter(student=student).order_by('-date')
            serializer = self.get_serializer(records, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)
