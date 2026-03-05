from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from datetime import timedelta
from .models import Book, BookIssue
from .serializers import BookSerializer, BookIssueSerializer
from academic.models import Parent, Student, Teacher


def _role(user) -> str:
    return (getattr(user, "role", "") or "").lower()


def _is_library_manager(user) -> bool:
    return _role(user) in {"admin", "staff", "saas_admin"}

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {"create", "update", "partial_update", "destroy"} and not _is_library_manager(request.user):
            raise PermissionDenied("Only library managers can modify books.")

class BookIssueViewSet(viewsets.ModelViewSet):
    queryset = BookIssue.objects.all()
    serializer_class = BookIssueSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in {"create", "update", "partial_update", "destroy", "return_book"} and not _is_library_manager(request.user):
            raise PermissionDenied("Only library managers can manage book issues.")

    def get_queryset(self):
        queryset = super().get_queryset().select_related("student__user", "book")
        user = self.request.user
        role = _role(user)

        # 1. Role-based filtering
        if role == 'student':
            try:
                student = Student.objects.get(user=user)
                queryset = queryset.filter(student=student)
            except Student.DoesNotExist:
                queryset = queryset.none()
        elif role == "parent":
            parent = Parent.objects.prefetch_related("students").filter(user=user).first()
            if not parent:
                queryset = queryset.none()
            else:
                queryset = queryset.filter(student__in=parent.students.all())
        elif role == "teacher":
            teacher = Teacher.objects.prefetch_related("assigned_classes").filter(user=user).first()
            if not teacher:
                queryset = queryset.none()
            else:
                class_ids = list(teacher.assigned_classes.values_list("id", flat=True))
                queryset = queryset.filter(student__academic_class_id__in=class_ids) if class_ids else queryset.none()

        # 2. Auto-update overdue status
        today = timezone.now().date()
        queryset.filter(
            status='issued',
            due_date__lt=today
        ).update(status='overdue')

        return queryset

    def perform_create(self, serializer):
        student = serializer.validated_data.get("student")
        actor_tenant = getattr(self.request.user, "tenant", None)
        student_tenant = getattr(getattr(student, "user", None), "tenant", None)
        if actor_tenant and student_tenant and actor_tenant != student_tenant:
            raise PermissionDenied("Cannot issue books across tenants.")

        # Set due date to 14 days from now if not provided
        if not serializer.validated_data.get('due_date'):
            due_date = timezone.now().date() + timedelta(days=14)
            serializer.save(due_date=due_date)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """Mark book as returned (stock update handled by model)"""
        issue = self.get_object()
        
        # Check if already returned
        if issue.status == 'returned':
            return Response(
                {'error': 'Book already returned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Updating status to 'returned' will trigger stock increment in models.py
            issue.return_date = timezone.now().date()
            issue.status = 'returned'
            
            # Calculate fine if overdue
            if issue.return_date > issue.due_date:
                days_overdue = (issue.return_date - issue.due_date).days
                issue.fine_amount = days_overdue * 0.50  # $0.50 per day
            
            issue.save()
            
            serializer = self.get_serializer(issue)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
