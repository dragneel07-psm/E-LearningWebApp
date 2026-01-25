import os
import django
import sys
import json

# Setup Django
sys.path.append('/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from ai_engine.services.predictive_service import PredictiveAnalyticsService
from ai_engine.services.reporting_service import ReportingService
from academic.models import Student, AcademicClass
from core.models import Tenant

def verify_sprint_7():
    print("--- Sprint 7 Verification ---")
    
    tenant = Tenant.objects.first()
    db_alias = 'default'
    
    if tenant:
        from django.conf import settings
        db_path = settings.BASE_DIR / "config" / tenant.db_name
        if 'demo' not in settings.DATABASES:
            settings.DATABASES['demo'] = settings.DATABASES['default'].copy()
            settings.DATABASES['demo']['NAME'] = db_path
        db_alias = 'demo'
    
    # 1. Test Predictive Analytics
    predictor = PredictiveAnalyticsService()
    classes = AcademicClass.objects.using(db_alias).all()
    class_ids = [c.id for c in classes]
    
    print(f"\n[1] Testing Predictive Analytics for classes: {class_ids}")
    analytics = predictor.get_teacher_dashboard_data(class_ids, using=db_alias)
    
    if "error" in analytics:
        print(f"❌ Analytics Error: {analytics['error']}")
    else:
        print(f"✅ Analytics Success!")
        print(f"   At Risk Students: {analytics['at_risk_count']}")
        print(f"   AI Insights: {len(analytics['ai_insights'])}")

    # 2. Test AI Student Report
    reporter = ReportingService()
    student = Student.objects.using(db_alias).first()
    
    if student:
        print(f"\n[2] Testing AI Report for student: {student.user.get_full_name()}")
        # We simulate the AI response if no key is present, which is already in the service
        report = reporter.generate_student_report(student.student_id, save=False, using=db_alias)
        
        if "error" in report:
            print(f"❌ Reporting Error: {report['error']}")
        else:
            print(f"✅ Report Generated!")
            print(f"   Summary: {report['ai_report']['summary'][:100]}...")
            print(f"   Strengths: {len(report['ai_report']['strengths'])}")
    else:
        print("\n[2] No student found for report testing.")

    # 3. Test Class Summary
    if class_ids:
        print(f"\n[3] Testing Class Summary for class ID: {class_ids[0]}")
        class_summary = reporter.generate_class_summary(class_ids[0], using=db_alias)
        
        if "error" in class_summary:
            print(f"❌ Class Summary Error: {class_summary['error']}")
        else:
            print(f"✅ Class Summary Generated!")
            print(f"   AI Summary: {class_summary['ai_summary'][:100]}...")

if __name__ == "__main__":
    verify_sprint_7()
