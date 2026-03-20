# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from rest_framework import permissions

class IsSaaSAdmin(permissions.BasePermission):
    """
    Allocates permissions for SaaS Super Admins
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'saas_admin')

class IsAdmin(permissions.BasePermission):
    """
    Allocates permissions for School Admins (Principals/IT)
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')

class IsTeacher(permissions.BasePermission):
    """
    Allocates permissions for Teachers
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'teacher')

class IsStudent(permissions.BasePermission):
    """
    Allocates permissions for Students
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'student')

class IsParent(permissions.BasePermission):
    """
    Allocates permissions for Parents
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'parent')

# Composite Permissions (Mixins)
class IsTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        allowed_roles = ['teacher', 'admin', 'saas_admin']
        return bool(request.user and request.user.is_authenticated and request.user.role in allowed_roles)

class IsAdminOrSaaSAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        allowed_roles = ['admin', 'saas_admin']
        return bool(request.user and request.user.is_authenticated and request.user.role in allowed_roles)
