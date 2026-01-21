from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from ..models import Notice, Student
from ..serializers.communications import NoticeSerializer
from core.mixins import TenantScopedQuerysetMixin

class NoticeViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [IsAuthenticated]
    tenant_field = 'tenant' # Assuming Notice has a tenant field or we need to filter via related

    def get_queryset(self):
        user = self.request.user
        queryset = Notice.objects.all().order_by('-created_at')
        
        # In a multi-tenant system, we should filter by tenant first.
        # If Notice has a 'tenant' field, TenantScopedQuerysetMixin handles it if configured.
        
        if user.role == 'student':
            try:
                student = Student.objects.get(user=user)
                # Filter notices for this student:
                # 1. School-wide
                # 2. Specific to their class
                # 3. Specific to them personally
                queryset = queryset.filter(
                    Q(target_audience='school') |
                    Q(target_audience='class', target_class=student.academic_class) |
                    Q(target_audience='student', target_student=student)
                )
            except Student.DoesNotExist:
                # If no student profile, maybe only school-wide notices
                queryset = queryset.filter(target_audience='school')
                
        return queryset
