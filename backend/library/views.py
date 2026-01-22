from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from .models import Book, BookIssue
from .serializers import BookSerializer, BookIssueSerializer
from core.mixins import TenantScopedQuerysetMixin

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

class BookIssueViewSet(viewsets.ModelViewSet):
    queryset = BookIssue.objects.all()
    serializer_class = BookIssueSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Auto-update overdue status
        today = timezone.now().date()
        queryset.filter(
            status='issued',
            due_date__lt=today
        ).update(status='overdue')

        return queryset

    def perform_create(self, serializer):
        # Set due date to 14 days from now
        due_date = timezone.now().date() + timedelta(days=14)
        serializer.save(due_date=due_date)

    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        """Mark book as returned and update availability"""
        issue = self.get_object()
        
        # Check if already returned
        if issue.status == 'returned':
            return Response(
                {'error': 'Book already returned'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Lock the book row to prevent race conditions
                book = Book.objects.select_for_update().get(pk=issue.book.pk)
                
                # Update issue
                issue.return_date = timezone.now().date()
                issue.status = 'returned'
                
                # Calculate fine if overdue
                if issue.return_date > issue.due_date:
                    days_overdue = (issue.return_date - issue.due_date).days
                    issue.fine_amount = days_overdue * 0.50  # $0.50 per day
                
                issue.save()
                
                # Increment available copies
                book.available_copies += 1
                book.save(update_fields=['available_copies'])
            
            serializer = self.get_serializer(issue)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
