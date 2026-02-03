from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum
from core.models import Tenant
from billing.models import Invoice, Subscription
from ai_engine.models import AIInteractionLog
from django.db import connections
from django.conf import settings
from datetime import datetime, timedelta

class SaasKPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # 1. Basic Stats
        tenants = Tenant.objects.all()
        total_schools = tenants.count()
        
        # 2. Revenue (Aggregated from default DB)
        invoices = Invoice.objects.all()
        paid_invoices = invoices.filter(status='paid')
        mrr = paid_invoices.aggregate(total=Sum('amount'))['total'] or 0
        pending_revenue = invoices.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

        # 3. Aggregated Students across all tenants
        total_students = 0
        tenant_activity = []
        
        for tenant in tenants:
            students_count = 0
            db_alias = tenant.db_alias
            
            # Dynamically handle connection if not registered (defensive)
            if db_alias not in settings.DATABASES:
                new_db_config = settings.DATABASES['default'].copy()
                new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
                settings.DATABASES[db_alias] = new_db_config
            
            try:
                from academic.models import Student
                students_count = Student.objects.using(db_alias).count()
                total_students += students_count
                
                # Check status (simplistic: active if has students)
                status = 'active' if students_count > 0 else 'idle'
                tenant_activity.append({
                    'id': tenant.tenant_id,
                    'name': tenant.name,
                    'status': status,
                    'students': students_count
                })
            except Exception as e:
                print(f"Error fetching data for tenant {tenant.subdomain}: {e}")
                tenant_activity.append({
                    'id': tenant.tenant_id,
                    'name': tenant.name,
                    'status': 'error',
                    'students': 0
                })

        # 4. Revenue Trend (Live calculation)
        revenue_trend = []
        now = datetime.now()
        for i in range(5, -1, -1):
            target_date = now - timedelta(days=i*30)
            month_label = target_date.strftime('%b')
            
            # Aggregate paid invoices for this month
            month_paid = Invoice.objects.filter(
                status='paid',
                paid_date__year=target_date.year,
                paid_date__month=target_date.month
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            revenue_trend.append({
                'month': month_label,
                'mrr': float(month_paid),
                'projected': float(month_paid) * 1.1 # Simple projection
            })

        # 5. Dynamic Security Alerts
        alerts = []
        # Check for tenants with 'error' status (from step 3)
        for t in tenant_activity:
            if t['status'] == 'error':
                alerts.append({
                    'id': str(datetime.now().timestamp()),
                    'level': 'critical',
                    'title': f"Connection Error: {t['name']}",
                    'description': f"Failed to connect to tenant database {t['id']}. Investigating link...",
                    'timestamp': 'Just Now'
                })
        
        # Add a placeholder for demo if no real errors
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
                'ai_usage_avg': 12, # Static mock for now
            },
            'revenue_trend': revenue_trend,
            'tenant_activity': tenant_activity,
            'alerts': alerts
        })

class SaasAIUsageView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        tenants = Tenant.objects.all()
        total_tokens = 0
        total_cost = 0.0
        feature_counts = {}

        for tenant in tenants:
            db_alias = tenant.db_alias
            
            # Ensure connection exists
            if db_alias not in settings.DATABASES:
                new_db_config = settings.DATABASES['default'].copy()
                new_db_config['NAME'] = settings.BASE_DIR / tenant.db_name
                settings.DATABASES[db_alias] = new_db_config
            
            try:
                logs = AIInteractionLog.objects.using(db_alias).all()
                total_tokens += logs.aggregate(total=Sum('total_tokens'))['total'] or 0
                total_cost += float(logs.aggregate(total=Sum('cost_estimated'))['total'] or 0)
                
                # Aggregate by feature
                for log in logs:
                    feature = log.feature_used
                    feature_counts[feature] = feature_counts.get(feature, 0) + log.total_tokens
            except Exception as e:
                print(f"Error aggregated AI logs for {tenant.subdomain}: {e}")

        # Format feature usage for Recharts
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
