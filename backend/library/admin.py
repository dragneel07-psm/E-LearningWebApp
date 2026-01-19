from django.contrib import admin
from .models import Book, BookIssue

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'total_copies', 'available_copies', 'tenant']
    list_filter = ['category', 'tenant']
    search_fields = ['title', 'author', 'isbn']
    readonly_fields = ['book_id', 'created_at', 'updated_at']


@admin.register(BookIssue)
class BookIssueAdmin(admin.ModelAdmin):
    list_display = ['book', 'student', 'issued_date', 'due_date', 'return_date', 'status', 'fine_amount']
    list_filter = ['status', 'issued_date']
    search_fields = ['book__title', 'student__user__username']
    readonly_fields = ['issue_id', 'issued_date']
