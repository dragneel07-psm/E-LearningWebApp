from django.contrib import admin
from .models import (
    AcademicClass, Student, Teacher, Parent,
    Course, Lesson, Assessment, Result
)

@admin.register(AcademicClass)
class AcademicClassAdmin(admin.ModelAdmin):
    list_display = ('grade', 'section', 'tenant')
    list_filter = ('grade', 'tenant')
    search_fields = ('grade', 'section')

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'academic_class')
    list_filter = ('academic_class',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    raw_id_fields = ('user', 'academic_class')

@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    raw_id_fields = ('user',)

@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'tenant')
    list_filter = ('tenant',)
    search_fields = ('full_name', 'phone')
    filter_horizontal = ('students',)

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('subject', 'academic_class')
    list_filter = ('academic_class__grade',)
    search_fields = ('subject',)
    raw_id_fields = ('academic_class',)

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'content_type')
    list_filter = ('content_type', 'course__subject')
    search_fields = ('title', 'content')
    raw_id_fields = ('course',)

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'type', 'total_marks')
    list_filter = ('type', 'course__subject')
    search_fields = ('title',)
    raw_id_fields = ('course',)

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ('student', 'assessment', 'score', 'percentage')
    list_filter = ('assessment__type',)
    search_fields = ('student__user__username', 'assessment__title')
    raw_id_fields = ('assessment', 'student')
    
    def percentage(self, obj):
        if obj.assessment.total_marks > 0:
            return f"{(obj.score / obj.assessment.total_marks * 100):.1f}%"
        return "N/A"
    percentage.short_description = 'Percentage'
