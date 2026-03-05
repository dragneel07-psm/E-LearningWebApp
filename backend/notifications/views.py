from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Notification
from .serializers import NotificationSerializer
from core.async_jobs import enqueue_job
from notifications.tasks import send_notification_task

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['GET'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
    
    @action(detail=True, methods=['POST'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['POST'])
    def mark_all_as_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})

    @action(detail=False, methods=['POST'], url_path='dispatch')
    def enqueue_notification(self, request):
        recipient_id = str(request.data.get('recipient_id') or '').strip()
        title = str(request.data.get('title') or '').strip()
        message = str(request.data.get('message') or '').strip()
        link = request.data.get('link')
        channels = request.data.get('channels') or []

        if not recipient_id or not title or not message:
            return Response(
                {'detail': 'recipient_id, title, and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not isinstance(channels, list):
            return Response({'detail': 'channels must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        tenant_schema = str(getattr(getattr(request, 'tenant', None), 'schema_name', 'public'))
        job = enqueue_job(
            send_notification_task,
            tenant_schema=tenant_schema,
            recipient_id=recipient_id,
            title=title,
            message=message,
            link=link,
            channels=channels,
            job_name='notifications.send_notification',
            job_tenant_schema=tenant_schema,
        )
        return Response(job, status=status.HTTP_202_ACCEPTED)

from .models import NotificationTemplate
from .serializers import NotificationTemplateSerializer

class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by tenant
        if hasattr(self.request, 'tenant'):
             return NotificationTemplate.objects.filter(tenant=self.request.tenant)
        return NotificationTemplate.objects.none()
