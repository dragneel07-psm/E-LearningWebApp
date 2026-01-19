from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import Group, Permission
from .models import UserAccount
from .serializers import UserAccountSerializer, GroupSerializer, PermissionSerializer
from core.mixins import TenantScopedQuerysetMixin

class UserAccountViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = UserAccount.objects.all()
    serializer_class = UserAccountSerializer
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated], url_path='change-password')
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'old_password and new_password are required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(old_password):
            return Response(
                {'error': 'Invalid current password.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password updated successfully.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAdminUser]

class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAdminUser]

from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404

class AdminPasswordResetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # 1. Check if requester is Admin/Staff
        if not (request.user.is_staff or getattr(request.user, 'role', '') == 'admin'):
            return Response(
                {'error': 'You do not have permission to reset passwords.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        new_password = request.data.get('new_password')

        if not user_id or not new_password:
            return Response(
                {'error': 'user_id and new_password are required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"DEBUG: Password reset requested for {user_id} by {request.user} (Tenant: {request.user.tenant})")
            # 2. Get Target User (Filtered by Tenant implicitly if using correct manager/queryset, 
            #    but effectively we check tenant match manually for safety)
            target_user = get_object_or_404(UserAccount, pk=user_id)
            print(f"DEBUG: Found user {target_user} (Tenant: {target_user.tenant})")
            
            # 3. Tenant Isolation Check
            # Ensure target user belongs to the same tenant as the requester
            if target_user.tenant != request.user.tenant:
                print(f"DEBUG: Tenant Mismatch! {target_user.tenant} vs {request.user.tenant}")
                return Response(
                    {'error': 'User not found in your organization.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            # 4. Set Password
            target_user.set_password(new_password)
            target_user.save()
            print("DEBUG: Password reset successful.")
            return Response({'message': 'Password reset successfully.'})
        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# User Registration View
from rest_framework.decorators import api_view, permission_classes
from .serializers import UserRegistrationSerializer

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    """
    Register a new user
    
    POST /api/auth/register/
    {
        "email": "user@example.com",
        "username": "username",  # Optional, will use email prefix if not provided
        "password": "SecurePass123!",
        "password_confirm": "SecurePass123!",
        "first_name": "John",
        "last_name": "Doe",
        "role": "student"  # Optional, defaults to 'student'
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.user_id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
            },
            'tokens': serializer.data['tokens']
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Custom Login View
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login view that returns JWT tokens with custom claims (role, etc.)
    POST /api/auth/login/
    """
    serializer_class = MyTokenObtainPairSerializer
