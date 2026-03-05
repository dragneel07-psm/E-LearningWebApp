from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from core.models import AuditLog
from core.models.tenant import Domain
from core.views_saas import TenantUserPasswordResetView
from users.models import UserAccount


class SaasAdminMutationAuditTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "SaaS Audit School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.factory = APIRequestFactory()
        with schema_context("public"):
            public_domain = Domain.objects.filter(tenant__schema_name="public").order_by("-is_primary").first()
            public_host = public_domain.domain if public_domain else "localhost"
        self.public_client = APIClient(HTTP_HOST=public_host)
        with schema_context("public"):
            self.saas_admin = UserAccount.objects.create_user(
                username="saas_audit_admin",
                email="saas_audit_admin@example.com",
                password="Saas@1234",
                role="saas_admin",
                is_staff=True,
                is_superuser=True,
                tenant=None,
            )

        with schema_context(self.tenant.schema_name):
            self.tenant_user = UserAccount.objects.create_user(
                username="tenant_reset_target",
                email="tenant_reset_target@example.com",
                password="OldPass@1234",
                role="teacher",
                tenant=self.tenant,
            )

    def test_tenant_user_password_reset_writes_audit_log(self):
        request = self.factory.post(
            f"/api/core/tenants/{self.tenant.id}/users/{self.tenant_user.user_id}/reset-password/",
            {"new_password": "NewPass@1234"},
            format="json",
        )
        force_authenticate(request, user=self.saas_admin)
        response = TenantUserPasswordResetView.as_view()(
            request,
            tenant_id=str(self.tenant.id),
            user_id=str(self.tenant_user.user_id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        row = AuditLog.objects.filter(
            action="core.tenant_user_password_reset",
            details__tenant_id=str(self.tenant.id),
            details__target_user_id=str(self.tenant_user.user_id),
        ).first()
        self.assertIsNotNone(row)
