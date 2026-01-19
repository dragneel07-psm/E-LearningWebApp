from django.db import models
from django.core.exceptions import ValidationError
import uuid as uuid_lib
from core.models.tenant import Tenant
from academic.models import Student

class Book(models.Model):
    book_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='books')
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=13, null=True, blank=True)  # Removed unique=True
    category = models.CharField(max_length=100, choices=[
        ('fiction', 'Fiction'),
        ('non_fiction', 'Non-Fiction'),
        ('science', 'Science'),
        ('mathematics', 'Mathematics'),
        ('history', 'History'),
        ('literature', 'Literature'),
        ('technology', 'Technology'),
        ('biography', 'Biography'),
        ('reference', 'Reference'),
        ('other', 'Other'),
    ])
    publisher = models.CharField(max_length=255, null=True, blank=True)
    published_year = models.IntegerField(null=True, blank=True)
    total_copies = models.IntegerField(default=1)
    available_copies = models.IntegerField(default=1)
    description = models.TextField(null=True, blank=True)
    cover_image = models.CharField(max_length=500, null=True, blank=True)  # URL to cover image
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['title']
        # ISBN should be unique per tenant, not globally
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'isbn'],
                name='unique_isbn_per_tenant',
                condition=models.Q(isbn__isnull=False)
            )
        ]

    def clean(self):
        """Validate book data"""
        super().clean()
        
        if self.total_copies < 1:
            raise ValidationError({'total_copies': 'Total copies must be at least 1'})
        
        if self.available_copies < 0:
            raise ValidationError({'available_copies': 'Available copies cannot be negative'})
        
        if self.available_copies > self.total_copies:
            raise ValidationError({
                'available_copies': 'Available copies cannot exceed total copies'
            })
        
        if self.published_year and (self.published_year < 1000 or self.published_year > 2100):
            raise ValidationError({
                'published_year': 'Published year must be between 1000 and 2100'
            })

    def __str__(self):
        return f"{self.title} by {self.author}"


class BookIssue(models.Model):
    issue_id = models.UUIDField(primary_key=True, default=uuid_lib.uuid4, editable=False)
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='issues')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='book_issues')
    issued_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('issued', 'Issued'),
        ('returned', 'Returned'),
        ('overdue', 'Overdue'),
    ], default='issued')
    fine_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    remarks = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-issued_date']

    def __str__(self):
        try:
            return f"{self.book.title} - {self.student.user.username}"
        except:
            return f"Issue: {self.issue_id}"
    
    def clean(self):
        """Validate book issue data"""
        super().clean()
        
        # Check if book is available
        if not self.pk and self.book.available_copies < 1:
            raise ValidationError({
                'book': f'No copies of "{self.book.title}" are currently available'
            })
        
        # Validate dates
        if self.return_date and self.return_date < self.issued_date.date():
            raise ValidationError({
                'return_date': 'Return date cannot be before issue date'
            })

    def save(self, *args, **kwargs):
        """Update book availability when issuing - with transaction safety"""
        from django.db import transaction
        
        with transaction.atomic():
            # New issue - decrement available copies
            if not self.pk:
                # Lock the book row to prevent race conditions
                book = Book.objects.select_for_update().get(pk=self.book.pk)
                
                if book.available_copies > 0:
                    book.available_copies -= 1
                    book.save(update_fields=['available_copies'])
                else:
                    raise ValidationError('No copies available for this book')
            
            super().save(*args, **kwargs)
