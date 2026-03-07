from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action, throttle_classes
from rest_framework.response import Response
from django.contrib.auth.models import Group, Permission
from .models import UserAccount
from .serializers import (
    UserAccountSerializer, UserManagementSerializer, GroupSerializer, PermissionSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer, RoleAwareTokenRefreshSerializer
)
from .permissions import IsAdminOrSaaSAdmin
from core.mixins import TenantScopedQuerysetMixin
from .throttling import (
    LoginRateThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRateThrottle,
    RefreshRateThrottle,
    RegisterRateThrottle,
)
import traceback
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.shortcuts import get_object_or_404
from core.utils.audit import record_audit_event

class UserAccountViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = UserAccount.objects.all()
    serializer_class = UserAccountSerializer

    def get_permissions(self):
        if self.action in ['me', 'change_password']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrSaaSAdmin()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserManagementSerializer
        return UserAccountSerializer
    
    @action(
        detail=False,
        methods=['get', 'patch'],
        permission_classes=[permissions.IsAuthenticated],
        throttle_classes=[],
    )
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        if not (request.user.role in ['admin', 'saas_admin']):
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
            target_user = get_object_or_404(UserAccount, pk=user_id)
            
            # Tenant Isolation Check
            # 1. SaaS Admin can reset anyone's password
            # 2. Tenant Admin can only reset users in their own tenant
            if request.user.role == 'admin':
                if target_user.tenant != request.user.tenant:
                    return Response(
                        {'error': 'User not found in your organization.'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            elif request.user.role == 'saas_admin':
                 # SaaS Admin is global
                 pass
            else:
                return Response({'error': 'Unauthorized role'}, status=status.HTTP_403_FORBIDDEN)

            # 4. Set Password
            target_user.set_password(new_password)
            target_user.save()
            record_audit_event(
                action="users.admin_password_reset",
                user=request.user,
                request=request,
                details={
                    "target_user_id": str(target_user.user_id),
                    "target_email": target_user.email,
                    "target_tenant_id": str(getattr(target_user, "tenant_id", "") or ""),
                    "initiator_role": getattr(request.user, "role", None),
                },
            )
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
@throttle_classes([RegisterRateThrottle])
def register_user(request):
    """
    Register a new user
    
    POST /api/auth/register/
    """
    serializer = UserRegistrationSerializer(data=request.data, context={'request': request})
    
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
from rest_framework_simplejwt.views import TokenRefreshView
from .serializers import MyTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login view that returns JWT tokens with custom claims (role, etc.)
    POST /api/auth/login/
    """
    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = [RefreshRateThrottle]
    serializer_class = RoleAwareTokenRefreshSerializer

# Password Reset via Email (Views)
class PasswordResetView(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = UserAccount.objects.get(email=email)
            
            # Generate Token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Construct Link (Frontend URL)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_link = f"{frontend_url}/reset-password?uidb64={uid}&token={token}"
            
            # Send Email (Mock/Console)
            print(f"--- PASSWORD RESET EMAIL ---\nTo: {email}\nLink: {reset_link}\n----------------------------")
            send_mail(
                subject="Password Reset Request",
                message=f"Click the link to reset your password: {reset_link}",
                from_email=settings.DEFAULT_FROM_EMAIL or 'noreply@example.com',
                recipient_list=[email],
                fail_silently=True # Prevent crash in dev without smtp
            )
            
            return Response({"message": "Password reset link sent to email."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetConfirmView(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetConfirmRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Password reset successful."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
