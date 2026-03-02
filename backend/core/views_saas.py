from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count, Max
from core.models import Tenant
from billing.models import Invoice, Subscription
from django.conf import settings
from datetime import datetime, timedelta
from collections import defaultdict
from decimal import Decimal
import os
from django_tenants.utils import schema_context
from django.db.models.functions import TruncDate


class IsSaaSAdmin(permissions.BasePermission):
    """
    Custom permission to only allow platform-level SaaS admins.
    Does NOT require is_staff=True, only role='saas_admin'.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'saas_admin')

class SaasKPIView(APIView):
    permission_classes = [IsSaaSAdmin]

    def get(self, request):
        # 1. Basic Stats
        tenants = Tenant.objects.all()
        total_schools = tenants.count()

        # 2. Revenue (Aggregated from default/public schema DB)
        invoices = Invoice.objects.all()
        paid_invoices = invoices.filter(status='paid')
        mrr = paid_invoices.aggregate(total=Sum('amount'))['total'] or 0
        pending_revenue = invoices.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

        # 3. Aggregated Students across all tenants using django-tenants schema_context
        total_students = 0
        tenant_activity = []

        try:
            from django_tenants.utils import schema_context
            from academic.models import Student

            for tenant in tenants:
                try:
                    with schema_context(tenant.schema_name):
                        students_count = Student.objects.count()
                    total_students += students_count
                    status = 'active' if students_count > 0 else 'idle'
                    tenant_activity.append({
                        'id': str(tenant.id),
                        'name': tenant.name,
                        'status': status,
                        'students': students_count
                    })
                except Exception as e:
                    print(f"Error fetching data for tenant {tenant.schema_name}: {e}")
                    tenant_activity.append({
                        'id': str(tenant.id),
                        'name': tenant.name,
                        'status': 'error',
                        'students': 0
                    })
        except Exception as outer_err:
            print(f"SaasKPIView outer error: {outer_err}")
            tenant_activity = [{'id': str(t.id), 'name': t.name, 'status': 'unknown', 'students': 0} for t in tenants]

        # 4. Revenue Trend (Live calculation — using issued_date which exists on Invoice)
        revenue_trend = []
        now = datetime.now()
        for i in range(5, -1, -1):
            target_date = now - timedelta(days=i * 30)
            month_label = target_date.strftime('%b')

            month_paid = Invoice.objects.filter(
                status='paid',
                issued_date__year=target_date.year,
                issued_date__month=target_date.month
            ).aggregate(total=Sum('amount'))['total'] or 0

            revenue_trend.append({
                'month': month_label,
                'mrr': float(month_paid),
                'projected': float(month_paid) * 1.1
            })

        # 5. Dynamic Security Alerts
        alerts = []
        for t in tenant_activity:
            if t['status'] == 'error':
                alerts.append({
                    'id': str(datetime.now().timestamp()),
                    'level': 'critical',
                    'title': f"Connection Error: {t['name']}",
                    'description': f"Failed to connect to tenant schema {t['id']}. Investigating...",
                    'timestamp': 'Just Now'
                })

        if not alerts:
            alerts = [
                {'id': '1', 'level': 'info', 'title': 'System Integrity Check', 'description': 'All infrastructure nodes reporting healthy.', 'timestamp': '2h ago'},
                {'id': '2', 'level': 'warning', 'title': 'High AI Usage', 'description': 'Demo School has exceeded 80% of token limits.', 'timestamp': '5h ago'}
            ]

        return Response({
            'kpis': {
                'total_schools': total_schools,
                'total_students': total_students,
                'mrr': float(mrr),
                'pending_revenue': float(pending_revenue),
                'ai_usage_avg': 12,
            },
            'revenue_trend': revenue_trend,
            'tenant_activity': tenant_activity,
            'alerts': alerts
        })


class SaasAIUsageView(APIView):
    permission_classes = [IsSaaSAdmin]

    def get(self, request):
        tenants = Tenant.objects.all()
        total_tokens = 0
        total_prompt_tokens = 0
        total_completion_tokens = 0
        total_requests = 0
        total_cost = Decimal('0')
        usage_by_feature_map = defaultdict(lambda: {
            'tokens': 0,
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'requests': 0,
            'cost_estimate': Decimal('0'),
        })
        top_tenants = []
        tenant_errors = []
        daily_usage_map = defaultdict(lambda: {'tokens': 0, 'requests': 0, 'cost_estimate': Decimal('0')})

        base_url = os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')
        model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
        api_key = os.getenv('OPENAI_API_KEY', '')
        configured = bool(api_key and api_key != 'demo-key')

        if 'openrouter.ai' in base_url:
            provider_name = 'OpenRouter'
        elif 'openai.com' in base_url:
            provider_name = 'OpenAI'
        else:
            provider_name = 'Custom OpenAI-Compatible'

        try:
            from django_tenants.utils import schema_context
            from ai_engine.models import AIInteractionLog

            for tenant in tenants:
                try:
                    with schema_context(tenant.schema_name):
                        logs = AIInteractionLog.objects.all()
                        tenant_totals = logs.aggregate(
                            total_tokens=Sum('total_tokens'),
                            total_prompt_tokens=Sum('prompt_tokens'),
                            total_completion_tokens=Sum('completion_tokens'),
                            total_cost=Sum('cost_estimated'),
                            total_requests=Count('log_id'),
                            last_activity=Max('timestamp'),
                        )

                        tenant_tokens = int(tenant_totals.get('total_tokens') or 0)
                        tenant_prompt_tokens = int(tenant_totals.get('total_prompt_tokens') or 0)
                        tenant_completion_tokens = int(tenant_totals.get('total_completion_tokens') or 0)
                        tenant_cost = Decimal(str(tenant_totals.get('total_cost') or 0))
                        tenant_requests = int(tenant_totals.get('total_requests') or 0)
                        tenant_last_activity = tenant_totals.get('last_activity')

                        total_tokens += tenant_tokens
                        total_prompt_tokens += tenant_prompt_tokens
                        total_completion_tokens += tenant_completion_tokens
                        total_cost += tenant_cost
                        total_requests += tenant_requests

                        if tenant_requests > 0:
                            top_tenants.append({
                                'tenant_id': str(tenant.id),
                                'tenant_name': tenant.name,
                                'tokens': tenant_tokens,
                                'prompt_tokens': tenant_prompt_tokens,
                                'completion_tokens': tenant_completion_tokens,
                                'requests': tenant_requests,
                                'cost_estimate': float(tenant_cost),
                                'avg_tokens_per_request': round(tenant_tokens / tenant_requests, 2),
                                'last_activity': tenant_last_activity.isoformat() if tenant_last_activity else None,
                            })

                        feature_usage = logs.values('feature_used').annotate(
                            tokens=Sum('total_tokens'),
                            prompt_tokens=Sum('prompt_tokens'),
                            completion_tokens=Sum('completion_tokens'),
                            cost=Sum('cost_estimated'),
                            requests=Count('log_id'),
                        )
                        for item in feature_usage:
                            feature_key = item.get('feature_used') or 'unknown'
                            usage_by_feature_map[feature_key]['tokens'] += int(item.get('tokens') or 0)
                            usage_by_feature_map[feature_key]['prompt_tokens'] += int(item.get('prompt_tokens') or 0)
                            usage_by_feature_map[feature_key]['completion_tokens'] += int(item.get('completion_tokens') or 0)
                            usage_by_feature_map[feature_key]['requests'] += int(item.get('requests') or 0)
                            usage_by_feature_map[feature_key]['cost_estimate'] += Decimal(str(item.get('cost') or 0))

                        last_7_days = datetime.now().date() - timedelta(days=6)
                        daily_usage = logs.filter(timestamp__date__gte=last_7_days).annotate(
                            day=TruncDate('timestamp')
                        ).values('day').annotate(
                            tokens=Sum('total_tokens'),
                            requests=Count('log_id'),
                            cost=Sum('cost_estimated'),
                        )
                        for day_item in daily_usage:
                            key = day_item['day'].isoformat()
                            daily_usage_map[key]['tokens'] += int(day_item.get('tokens') or 0)
                            daily_usage_map[key]['requests'] += int(day_item.get('requests') or 0)
                            daily_usage_map[key]['cost_estimate'] += Decimal(str(day_item.get('cost') or 0))
                except Exception as e:
                    print(f"Error aggregating AI logs for {tenant.schema_name}: {e}")
                    tenant_errors.append({
                        'tenant_id': str(tenant.id),
                        'tenant_name': tenant.name,
                        'schema_name': tenant.schema_name,
                        'error': str(e),
                    })
        except Exception as outer_err:
            print(f"SaasAIUsageView outer error: {outer_err}")
            tenant_errors.append({'error': str(outer_err)})

        usage_by_feature = []
        for feature_key, stats in usage_by_feature_map.items():
            tokens = stats['tokens']
            usage_by_feature.append({
                'feature': feature_key.replace('_', ' ').title(),
                'tokens': tokens,
                'prompt_tokens': stats['prompt_tokens'],
                'completion_tokens': stats['completion_tokens'],
                'requests': stats['requests'],
                'cost_estimate': float(stats['cost_estimate']),
                'percentage': round((tokens / total_tokens) * 100, 2) if total_tokens > 0 else 0,
            })

        usage_by_feature.sort(key=lambda x: x['tokens'], reverse=True)
        top_tenants.sort(key=lambda x: x['tokens'], reverse=True)

        daily_usage_last_7_days = []
        for i in range(6, -1, -1):
            day = (datetime.now().date() - timedelta(days=i)).isoformat()
            day_stats = daily_usage_map[day]
            daily_usage_last_7_days.append({
                'date': day,
                'tokens': day_stats['tokens'],
                'requests': day_stats['requests'],
                'cost_estimate': float(day_stats['cost_estimate']),
            })

        avg_cost_per_1k_tokens = float((total_cost / total_tokens * 1000) if total_tokens > 0 else 0)
        avg_tokens_per_request = float(total_tokens / total_requests) if total_requests > 0 else 0

        return Response({
            'provider': {
                'name': provider_name,
                'base_url': base_url,
                'model': model,
                'configured': configured,
            },
            'total_tokens': total_tokens,
            'total_prompt_tokens': total_prompt_tokens,
            'total_completion_tokens': total_completion_tokens,
            'total_requests': total_requests,
            'cost_estimate': float(total_cost),
            'avg_cost_per_1k_tokens': round(avg_cost_per_1k_tokens, 6),
            'avg_tokens_per_request': round(avg_tokens_per_request, 2),
            'active_tenants': len([t for t in top_tenants if t['tokens'] > 0]),
            'total_tenants': tenants.count(),
            'usage_by_feature': usage_by_feature,
            'top_tenants': top_tenants[:10],
            'daily_usage_last_7_days': daily_usage_last_7_days,
            'tenant_errors': tenant_errors,
        })


class TenantAdminPasswordResetView(APIView):
    permission_classes = [IsSaaSAdmin]

    def post(self, request):
        tenant_id = request.data.get('tenant_id')
        new_password = request.data.get('new_password')

        if not tenant_id or not new_password:
            return Response({"error": "tenant_id and new_password are required"}, status=400)

        try:
            from django_tenants.utils import schema_context
            from users.models import UserAccount
            
            tenant = Tenant.objects.get(id=tenant_id)
            
            with schema_context(tenant.schema_name):
                # Find the admin user for this tenant
                # Generally, there's only one 'admin' role user created during onboarding
                admin_user = UserAccount.objects.filter(role='admin').first()
                if not admin_user:
                    return Response({"error": "Admin user not found for this tenant"}, status=404)
                
                admin_user.set_password(new_password)
                admin_user.save()
                
            return Response({"message": f"Password reset successfully for admin of {tenant.name}"})
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


def _serialize_tenant_user(user):
    return {
        "user_id": str(user.user_id),
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "tenant": str(user.tenant_id) if user.tenant_id else None,
        "is_active": user.is_active,
    }


class TenantUsersView(APIView):
    permission_classes = [IsSaaSAdmin]

    def get(self, request, tenant_id):
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)

        try:
            from users.models import UserAccount
            with schema_context(tenant.schema_name):
                users = UserAccount.objects.all().order_by("first_name", "last_name", "email")
                return Response([_serialize_tenant_user(u) for u in users])
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def post(self, request, tenant_id):
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)

        data = request.data or {}
        required = ["email", "password", "first_name", "last_name"]
        missing = [field for field in required if not data.get(field)]
        if missing:
            return Response({"error": f"Missing required fields: {', '.join(missing)}"}, status=400)

        role = data.get("role", "student")
        if role not in ["student", "teacher", "parent", "admin", "staff"]:
            return Response({"error": "Invalid role"}, status=400)

        username = data.get("username") or str(data.get("email")).split("@")[0]

        try:
            from users.models import UserAccount
            with schema_context(tenant.schema_name):
                user = UserAccount.objects.create_user(
                    email=data["email"],
                    username=username,
                    password=data["password"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    role=role,
                    tenant=tenant,
                    is_staff=role in ["admin", "staff"],
                )
                return Response(_serialize_tenant_user(user), status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class TenantUserDetailView(APIView):
    permission_classes = [IsSaaSAdmin]

    def patch(self, request, tenant_id, user_id):
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)

        try:
            from users.models import UserAccount
            with schema_context(tenant.schema_name):
                user = UserAccount.objects.get(pk=user_id)

                for field in ["first_name", "last_name", "email", "username"]:
                    if field in request.data:
                        setattr(user, field, request.data[field])

                if "role" in request.data:
                    role = request.data["role"]
                    if role not in ["student", "teacher", "parent", "admin", "staff", "saas_admin"]:
                        return Response({"error": "Invalid role"}, status=400)
                    user.role = role
                    user.is_staff = role in ["admin", "staff", "saas_admin"]

                if "is_active" in request.data:
                    user.is_active = bool(request.data["is_active"])

                user.save()
                return Response(_serialize_tenant_user(user))
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class TenantUserPasswordResetView(APIView):
    permission_classes = [IsSaaSAdmin]

    def post(self, request, tenant_id, user_id):
        new_password = request.data.get("new_password")
        if not new_password:
            return Response({"error": "new_password is required"}, status=400)

        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"error": "Tenant not found"}, status=404)

        try:
            from users.models import UserAccount
            with schema_context(tenant.schema_name):
                user = UserAccount.objects.get(pk=user_id)
                user.set_password(new_password)
                user.save()
                return Response({"message": "Password reset successfully"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
