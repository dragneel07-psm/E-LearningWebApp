# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from ..models.notice import Notice
from ..serializers.notice import NoticeSerializer
from core.mixins import TenantScopedQuerysetMixin
from notifications.services import NotificationService

class NoticeViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'student':
            # Students see: School-wide + Their Class + Targeted to them
            student_profile = getattr(user, 'student_profile', None)
            if student_profile:
                return queryset.filter(
                    Q(target_audience='school') |
                    Q(target_audience='class', target_class=student_profile.academic_class) |
                    Q(target_audience='student', target_student=student_profile)
                )
            return queryset.none()
        
        elif user.role in ['teacher', 'admin', 'saas_admin']:
            # Staff sees all notices in their tenant
            return queryset
        
        return queryset.none()

    def perform_create(self, serializer):
        tenant = self.request.user.tenant
        notice = serializer.save(tenant=tenant)
        
        # Trigger Notifications based on audience
        try:
            if notice.target_audience == 'school':
                NotificationService.notify_role(tenant, 'student', f"New Notice: {notice.title}", notice.content)
                NotificationService.notify_role(tenant, 'teacher', f"New Notice: {notice.title}", notice.content)
            elif notice.target_audience == 'class' and notice.target_class:
                NotificationService.notify_class(tenant, notice.target_class, f"Class Notice: {notice.title}", notice.content)
            elif notice.target_audience == 'student' and notice.target_student:
                NotificationService.create_notification(notice.target_student.user, f"Personal Notice: {notice.title}", notice.content, tenant=tenant)
        except Exception as e:
            # Prevent notice creation failure due to notification error
            print(f"Error sending notifications: {e}")
