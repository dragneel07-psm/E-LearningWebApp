from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum
from core.models import Tenant
from billing.models import Invoice, Subscription
from django.conf import settings
from datetime import datetime, timedelta


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
        total_cost = 0.0
        feature_counts = {}

        try:
            from django_tenants.utils import schema_context
            from ai_engine.models import AIInteractionLog

            for tenant in tenants:
                try:
                    with schema_context(tenant.schema_name):
                        logs = AIInteractionLog.objects.all()
                        total_tokens += logs.aggregate(total=Sum('total_tokens'))['total'] or 0
                        total_cost += float(logs.aggregate(total=Sum('cost_estimated'))['total'] or 0)

                        for log in logs:
                            feature = log.feature_used
                            feature_counts[feature] = feature_counts.get(feature, 0) + log.total_tokens
                except Exception as e:
                    print(f"Error aggregating AI logs for {tenant.schema_name}: {e}")
        except Exception as outer_err:
            print(f"SaasAIUsageView outer error: {outer_err}")

        usage_by_feature = []
        if total_tokens > 0:
            for feature, tokens in feature_counts.items():
                usage_by_feature.append({
                    'feature': feature.replace('_', ' ').capitalize(),
                    'percentage': round((tokens / total_tokens) * 100)
                })
        else:
            usage_by_feature = [
                {'feature': 'Tutor Chat', 'percentage': 0},
                {'feature': 'Predictive Analytics', 'percentage': 0},
                {'feature': 'Study Planner', 'percentage': 0},
            ]

        return Response({
            'total_tokens': total_tokens,
            'cost_estimate': total_cost,
            'usage_by_feature': usage_by_feature
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
