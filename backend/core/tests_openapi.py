from django_tenants.test.cases import FastTenantTestCase
from rest_framework.test import APIClient


class OpenApiSchemaEndpointTests(FastTenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Schema Endpoint School"

    @classmethod
    def setup_domain(cls, domain):
        domain.is_primary = True

    def setUp(self):
        self.client = APIClient(
            HTTP_HOST=self.get_test_tenant_domain(),
            HTTP_X_TENANT_ID=self.tenant.schema_name,
        )

    def test_schema_endpoint_returns_openapi_document(self):
        response = self.client.get("/api/schema/?format=openapi-json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("openapi", response.data)
        self.assertIn("info", response.data)

    def test_v1_schema_endpoint_alias_returns_openapi_document(self):
        response = self.client.get("/api/v1/schema/?format=openapi-json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("openapi", response.data)
        self.assertIn("info", response.data)
