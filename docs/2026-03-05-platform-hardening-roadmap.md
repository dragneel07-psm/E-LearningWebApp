# Platform Hardening Roadmap (A-F)
## Date: March 5, 2026

## Goal
Upgrade the LMS into a safer, tenant-correct, school-ERP-ready platform without breaking current delivery velocity.

## Phase 1: Tenant Boundary and Auth Safety (Implemented in this batch)
- [x] A1: `x-tenant-id` trust is now dev-only by default (`TENANT_HEADER_TRUST_MODE=dev_only`).
- [x] A2: JWT now carries tenant identity (`tenant_schema`, `tenant_id`) and API auth enforces token tenant == request tenant == user tenant.
- [x] A3: Tenant status gate added in middleware (`active`/`trial` allowed; suspended/expired blocked).
- [x] B8: Auth endpoints now use scoped DRF throttles (login, refresh, register, password reset/confirm).
- [x] D23: Health endpoints added (`/healthz`, `/readyz`).
- [x] E24: API v1 aliases added (`/api/v1/...`) while keeping existing `/api/...` compatibility.
- [x] E25: Standardized API error shape added (`{code, message, field_errors, trace_id}`).
- [x] E27: Tenant capabilities endpoint added (`/api/core/capabilities/`).

## Phase 2: Tenant Data Architecture Correctness (Next)
- [~] A4-A5: Billing API boundary enforcement started:
  - shared billing APIs now public-schema only
  - school finance APIs now tenant-schema only
  - tenant-bound object validation added for fee/payment mutations
- [x] A6: Tenant-aware upload paths implemented for tenant logos, notice attachments, and lesson material files (`tenant/<schema>/...`).
- [ ] A7: Tenant-aware cache key strategy for Redis rollout.
- [~] B10-B11: Role + object-level authorization hardening in progress:
  - billing object validations + schema guards completed
  - attendance and library role/object restrictions implemented
  - assessment/question/submission/result/exam RBAC + object-scope restrictions implemented
  - remaining modules pending (report/export edge cases and final permission cleanup)
- [~] B13: Extend audit logging to marks edits, fee edits, role changes, result publishing, and sensitive exports.
  - core audit utility added with structured details + trace/tenant metadata
  - coverage added for user role changes, billing mutations, result grading/edits, and publish/reopen result actions
  - sensitive export audit events added for academic reports, billing reports/invoices/receipts, and backup downloads
  - high-risk admin mutation audit events added for admin password resets and subscription/tenant-user management changes
  - remaining: final pass for additional platform-admin workflows

## Phase 3: Security and API Productization (Next)
- [ ] B9: Role-based token lifetimes and strict refresh rotation policies per role risk.
- [ ] B12: CSP baseline and stricter environment-specific CORS allowlists.
- [ ] E26: OpenAPI generation + typed client pipeline for web/mobile consistency.
- [ ] D20-D21: Structured logging with request/tenant correlation + Sentry integration.

## Phase 4: Scale and Throughput (Next)
- [ ] C14: Redis + async workers (Celery/RQ/Dramatiq) for notifications, report/PDF generation, imports, AI tasks.
- [ ] C16-C18: Query optimization policy, indexing pass, and pagination/max-page standardization.
- [ ] C19: Idempotency keys for billing/payment mutations.
- [ ] C15: Read-replica strategy for reporting workloads.
- [ ] D22: Prometheus/metrics baseline (latency, error rate, DB time, queue depth).

## Phase 5: Mobile UX and Media Delivery (Next)
- [ ] F28: Offline write queue + sync/conflict strategy for attendance/remarks.
- [ ] F29: Centralized role navigation from server-driven permissions.
- [ ] F30: CDN strategy with signed URLs and resumable uploads.

## Rollout Controls
1. Deploy in order: middleware/auth changes -> health/check endpoints -> throttles.
2. Run smoke tests on each environment:
   - login/refresh/register/reset
   - tenant-check and capabilities
   - `/healthz` and `/readyz`
   - cross-tenant token replay attempt (must fail)
3. Enable production settings:
   - `TENANT_HEADER_TRUST_MODE=never` once domain routing is fully ready
   - explicit `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEXES`
4. Monitor auth failures and 403 tenant gates for 48 hours after release.
