from django.test import override_settings
from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient


class TenantResolutionSecurityTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Security School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient()
        self.tenant_check_url = "/api/core/tenant-check/"

    @override_settings(DEBUG=False, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_header_tenant_resolution_is_disabled_in_production_mode(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="unknown.localhost",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("code"), "tenant_domain_required")

    @override_settings(DEBUG=True, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_header_tenant_resolution_is_enabled_in_debug_mode(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST="unknown.localhost",
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data.get("exists"))
        self.assertEqual(response.data.get("schema_name"), self.tenant.schema_name)

    def test_suspended_tenant_is_blocked_by_status_gate(self):
        self.tenant.status = "suspended"
        self.tenant.save(update_fields=["status"])

        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json().get("code"), "tenant_inactive")

    @override_settings(DEBUG=False, TENANT_HEADER_TRUST_MODE="dev_only")
    def test_spoofed_tenant_header_is_rejected_in_production(self):
        response = self.client.get(
            self.tenant_check_url,
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID="spoofed-school",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("code"), "tenant_header_rejected")
