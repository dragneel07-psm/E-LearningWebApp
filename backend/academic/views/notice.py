from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from ..models.notice import Notice
from ..serializers import NoticeSerializer
from users.models import UserAccount

class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Notice.objects.all()

        if user.role == 'student':
            # Students see: School-wide + Their Class + Targeted to them
            # Assuming user.student_profile exists
            student_profile = getattr(user, 'student_profile', None)
            if student_profile:
                return queryset.filter(
                    target_audience='school'
                ) | queryset.filter(
                    target_audience='class',
                    target_class=student_profile.academic_class
                ) | queryset.filter(
                    target_audience='student',
                    target_student=student_profile
                )
            return queryset.none()
        
        elif user.role in ['teacher', 'admin', 'saas_admin']:
            # Teachers/Admins see all created notices (or filter by creator if needed)
            return queryset
        
        return queryset.none()

    def perform_create(self, serializer):
        # Could auto-assign author if we had that field
        serializer.save()
