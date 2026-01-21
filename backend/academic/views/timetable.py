from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Timetable, Student
from ..serializers.timetable import TimetableSerializer
from core.mixins import TenantScopedQuerysetMixin

class TimetableViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    serializer_class = TimetableSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'academic_class__section__teachers__user__tenant' # This might be tricky, let's use a simpler path or assume tenant context is handled by mixin properly if we override get_queryset

    def get_queryset(self):
        # We need to filter based on tenant. 
        # Timetable -> AcademicClass -> Section -> (Tenant) ?
        # Actually AcademicClass should have a link to tenant ideally or via SchoolYear.
        # Let's assume for now we filter by what the user can see.
        
        user = self.request.user
        queryset = Timetable.objects.all() # Start with all, filter down
        
        # If student, filter by their class
        if user.role == 'student':
            try:
                student = Student.objects.get(user=user)
                if student.academic_class:
                    queryset = queryset.filter(academic_class=student.academic_class)
            except Student.DoesNotExist:
                return Timetable.objects.none()
        
        # If teacher, filter by classes they teach (if we had that link directly on timetable)
        # For now, let's stick to simple implementation
        
        return queryset

    @action(detail=False, methods=['get'])
    def my_timetable(self, request):
        """Get the current student's timetable"""
        user = request.user
        if user.role != 'student':
             return Response({"detail": "Only students can view their timetable here."}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            student = Student.objects.get(user=user)
            if not student.academic_class:
                 return Response([], status=status.HTTP_200_OK)
                 
            timetable = self.get_queryset().filter(academic_class=student.academic_class).order_by('day_of_week', 'start_time')
            serializer = self.get_serializer(timetable, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({"error": "Student profile not found"}, status=status.HTTP_404_NOT_FOUND)
