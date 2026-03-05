from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from academic.models import AcademicClass, Student
from billing.models import FeeStructure, Invoice, Payment, StudentFee, Subscription, SubscriptionPlan
from billing.serializers import SubscriptionSerializer
from billing.views import InvoiceViewSet, SubscriptionViewSet
from core.models import AuditLog
from core.models.tenant import Domain

User = get_user_model()


class BillingBoundaryAndValidationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Billing Security School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.factory = APIRequestFactory()
        with schema_context("public"):
            public_domain = Domain.objects.filter(tenant__schema_name="public").order_by("-is_primary").first()
        public_host = public_domain.domain if public_domain else "localhost"

        self.tenant_client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.public_client = APIClient(HTTP_HOST=public_host)

        self.saas_admin = User.objects.create_user(
            username="saas_admin",
            email="saas_admin@example.com",
            password="Saas@1234",
            first_name="SaaS",
            last_name="Admin",
            role="saas_admin",
            is_staff=True,
            is_superuser=True,
            tenant=None,
        )

        self.tenant_admin = User.objects.create_user(
            username="tenant_admin",
            email="tenant_admin@example.com",
            password="Admin@1234",
            first_name="Tenant",
            last_name="Admin",
            role="admin",
            tenant=self.tenant,
        )
        self.student_user_1 = User.objects.create_user(
            username="student_one",
            email="student_one@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        self.student_user_2 = User.objects.create_user(
            username="student_two",
            email="student_two@example.com",
            password="Student@1234",
            role="student",
            tenant=self.tenant,
        )
        with schema_context(self.tenant.schema_name):
            self.grade_8 = AcademicClass.objects.create(name="Grade 8", order=8)
            self.student_1 = Student.objects.create(user=self.student_user_1, academic_class=self.grade_8)
            self.student_2 = Student.objects.create(user=self.student_user_2, academic_class=self.grade_8)

    def test_tenant_finance_endpoints_reject_public_schema_requests(self):
        self.public_client.force_authenticate(user=self.tenant_admin)
        response = self.public_client.get("/api/billing/fee-structures/")
        self.assertIn(response.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND})

    def test_public_billing_endpoints_reject_tenant_schema_requests(self):
        self.tenant_client.force_authenticate(user=self.saas_admin)
        response = self.tenant_client.get("/api/billing/subscriptions/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_fee_structure_create_forces_authenticated_tenant(self):
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.post(
            "/api/billing/fee-structures/",
            {
                "tenant": "00000000-0000-0000-0000-000000000000",
                "name": "Tuition",
                "amount": "1500.00",
                "frequency": "monthly",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        with schema_context(self.tenant.schema_name):
            created = FeeStructure.objects.get(fee_id=response.data["fee_id"])
        self.assertEqual(created.tenant_id, self.tenant.id)

    def test_payment_rejects_student_fee_belonging_to_another_student(self):
        with schema_context(self.tenant.schema_name):
            fee = FeeStructure.objects.create(
                tenant=self.tenant,
                name="Exam Fee",
                amount="600.00",
                frequency="one_time",
            )
            student_fee_1 = StudentFee.objects.create(
                tenant=self.tenant,
                student=self.student_1,
                fee_structure=fee,
                amount_due="600.00",
                due_date=timezone.now().date(),
            )
            student_fee_2 = StudentFee.objects.create(
                tenant=self.tenant,
                student=self.student_2,
                fee_structure=fee,
                amount_due="600.00",
                due_date=timezone.now().date(),
            )
        self.assertNotEqual(student_fee_1.student_id, student_fee_2.student_id)

        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.post(
            "/api/billing/payments/",
            {
                "student": str(self.student_1.student_id),
                "student_fee": str(student_fee_2.student_fee_id),
                "amount": "300.00",
                "method": "cash",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("student_fee", str(response.data.get("field_errors", {})))

    def test_payment_create_writes_audit_log(self):
        with schema_context(self.tenant.schema_name):
            fee = FeeStructure.objects.create(
                tenant=self.tenant,
                name="Annual Fee",
                amount="1200.00",
                frequency="annual",
            )
            student_fee = StudentFee.objects.create(
                tenant=self.tenant,
                student=self.student_1,
                fee_structure=fee,
                amount_due="1200.00",
                due_date=timezone.now().date(),
            )

        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.post(
            "/api/billing/payments/",
            {
                "student": str(self.student_1.student_id),
                "student_fee": str(student_fee.student_fee_id),
                "amount": "500.00",
                "method": "cash",
                "transaction_id": "TXN-500",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        audit_row = AuditLog.objects.filter(action="billing.payment_created").first()
        self.assertIsNotNone(audit_row)
        self.assertEqual(str(audit_row.details.get("student_id")), str(self.student_1.student_id))
        self.assertEqual(str(audit_row.details.get("payment_id")), response.data.get("payment_id"))

    def test_fee_collection_export_writes_audit_log(self):
        with schema_context(self.tenant.schema_name):
            Payment.objects.create(
                tenant=self.tenant,
                student=self.student_1,
                amount="200.00",
                method="cash",
                recorded_by=self.tenant_admin,
            )
        self.tenant_client.force_authenticate(user=self.tenant_admin)
        response = self.tenant_client.get("/api/billing/reports/fee-collection-excel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_row = AuditLog.objects.filter(
            action="billing.report_exported",
            details__report_type="fee_collection",
            details__format="xlsx",
        ).first()
        self.assertIsNotNone(audit_row)

    def test_invoice_download_writes_audit_log(self):
        with schema_context("public"):
            invoice = Invoice.objects.create(
                tenant=self.tenant,
                amount="500.00",
                status="pending",
            )
            request = self.factory.get(f"/api/billing/invoices/{invoice.invoice_id}/download/")
            force_authenticate(request, user=self.saas_admin)
            view = InvoiceViewSet.as_view({"get": "download"})
            response = view(request, pk=str(invoice.invoice_id))
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        audit_row = AuditLog.objects.filter(
            action="billing.invoice_downloaded",
            details__invoice_id=str(invoice.invoice_id),
        ).first()
        self.assertIsNotNone(audit_row)

    def test_subscription_status_change_writes_audit_log(self):
        with schema_context("public"):
            plan = SubscriptionPlan.objects.create(
                name="Audit Plan A",
                price_monthly="10.00",
                price_yearly="60.00",
                student_limit=100,
                teacher_limit=10,
                storage_limit_gb=5,
                ai_token_limit=5000,
                is_active=True,
            )
            subscription, _ = Subscription.objects.get_or_create(
                tenant=self.tenant,
                defaults={
                    "plan": plan,
                    "status": "trial",
                    "billing_cycle": "monthly",
                    "student_limit": plan.student_limit,
                    "storage_limit_gb": plan.storage_limit_gb,
                    "ai_token_limit": plan.ai_token_limit,
                },
            )
        with schema_context("public"):
            request = self.factory.patch("/api/billing/subscriptions/mock/", {"status": "active"}, format="json")
            request.data = {"status": "active"}
            force_authenticate(request, user=self.saas_admin)
            serializer = SubscriptionSerializer(
                instance=subscription,
                data={"status": "active"},
                partial=True,
                context={"request": request},
            )
            self.assertTrue(serializer.is_valid(), msg=serializer.errors)
            serializer.save()

        audit_row = AuditLog.objects.filter(
            action="billing.subscription_changed",
            details__subscription_id=str(subscription.subscription_id),
        ).first()
        self.assertIsNotNone(audit_row)
        self.assertEqual(audit_row.details.get("before", {}).get("status"), "trial")
        self.assertEqual(audit_row.details.get("after", {}).get("status"), "active")
