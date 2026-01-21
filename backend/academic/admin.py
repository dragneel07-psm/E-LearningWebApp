from django.contrib import admin
from .models import AcademicYear, AcademicClass, Section, Student, Teacher, Parent
# from .models import Course, Lesson, Assessment, Result

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_current')
    ordering = ('-start_date',)

@admin.register(AcademicClass)
class AcademicClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    ordering = ('order',)

@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'academic_class', 'capacity')
    list_filter = ('academic_class',)

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'academic_class')
    list_filter = ('academic_class',)
    raw_id_fields = ('user', 'academic_class')

@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ('user',)
    raw_id_fields = ('user',)

@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ('user',)
    raw_id_fields = ('user',)
    filter_horizontal = ('students',)
