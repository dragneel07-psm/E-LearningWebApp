from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from rest_framework import status
from rest_framework.test import APIClient

from academic.models import AcademicClass, Section, Student, Subject
from academic.models.assessment import Assessment, Result
from core.models import AuditLog

User = get_user_model()


class ResultCardReportTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Result Report Test School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(HTTP_HOST=self.get_test_tenant_domain(), HTTP_X_TENANT_ID=self.tenant.schema_name)
        self.admin_user = User.objects.create_user(
            username="report_admin",
            email="report_admin@example.com",
            password="Admin@1234",
            role="admin",
            first_name="Report",
            last_name="Admin",
            tenant=self.tenant,
        )
        self.student_user = User.objects.create_user(
            username="report_student",
            email="report_student@example.com",
            password="Student@1234",
            role="student",
            first_name="Report",
            last_name="Student",
            tenant=self.tenant,
        )

        self.academic_class = AcademicClass.objects.create(name="Grade 10", order=10)
        self.section = Section.objects.create(name="A", academic_class=self.academic_class)
        self.student = Student.objects.create(
            user=self.student_user,
            academic_class=self.academic_class,
            section=self.section,
        )
        self.subject = Subject.objects.create(name="Mathematics", code="MTH-10", academic_class=self.academic_class, is_active=True)
        self.assessment = Assessment.objects.create(
            subject=self.subject,
            section=self.section,
            title="Mid Term Quiz",
            type="quiz",
            total_marks=20,
            passing_marks=8,
            blooms_level="apply",
        )
        self.result = Result.objects.create(
            assessment=self.assessment,
            student=self.student,
            score=16,
            time_taken_minutes=20,
        )

    def test_result_card_uses_custom_primary_keys(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            f"/api/academic/reports/result-card/{self.student.student_id}/{self.result.result_id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(response["Content-Type"].split(";")[0], ["application/pdf", "text/html"])
        audit_row = AuditLog.objects.filter(
            action="academic.report_exported",
            details__report_type="result_card",
            details__result_id=str(self.result.result_id),
        ).first()
        self.assertIsNotNone(audit_row)
