from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.utils import tenant_context
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


class TenantJwtIsolationTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "JWT Isolation School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.tenant.status = "active"
        self.tenant.save(update_fields=["status"])

        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        with tenant_context(self.tenant):
            self.user = User.objects.create_user(
                username="tenant_student",
                email="tenant_student@example.com",
                password="TestPass123!",
                first_name="Tenant",
                last_name="Student",
                role="student",
                tenant=self.tenant,
            )

        login_response = self.client.post(
            "/api/users/login/",
            {"email": "tenant_student@example.com", "password": "TestPass123!"},
            format="json",
        )
        self.assertEqual(
            login_response.status_code,
            status.HTTP_200_OK,
            msg=f"login failed status={login_response.status_code} body={getattr(login_response, 'data', getattr(login_response, 'content', b''))}",
        )
        self.access_token = login_response.data["access"]

    def test_valid_tenant_claim_can_access_profile(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)

    def test_mismatched_tenant_claim_is_rejected(self):
        forged_token = AccessToken.for_user(self.user)
        forged_token["tenant_schema"] = "another_school"
        forged_token["tenant_id"] = "00000000-0000-0000-0000-000000000000"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(forged_token)}")
        response = self.client.get("/api/users/accounts/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get("code"), "token_tenant_user_mismatch")

    def test_tenant_status_blocks_authenticated_requests(self):
        self.tenant.status = "expired"
        self.tenant.save(update_fields=["status"])

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get("/api/users/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.json().get("code"), "tenant_inactive")
