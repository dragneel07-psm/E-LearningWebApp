# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Cross-tenant isolation coverage matrix — SCAFFOLD.

Each stub below is a known isolation surface that is not yet covered. They are
skipped (not deleted) so the suite documents the remaining matrix and fails
loudly in coverage review until implemented. Implement by subclassing
``TwoTenantAPITestCase`` and following the read pattern in
``core/tests_tenant_isolation.py`` and the write pattern in
``core/tests_tenant_isolation_writes.py``.

Priority order (highest data-sensitivity first):
  1. billing / fees        — financial records, payment refs
  2. conversations         — private messages between users
  3. academic breadth      — students, results, attendance, submissions
  4. library / gamification— lower sensitivity but same contract
  5. async (Celery)        — tasks must not write across schemas
  6. websockets            — sockets must not receive foreign events
"""

from __future__ import annotations

from unittest import skip

from core.tenant_isolation_base import TwoTenantAPITestCase

_TODO = "scaffold: implement cross-tenant isolation assertions"


# Academic breadth isolation — IMPLEMENTED in academic/tests_tenant_isolation.py
#   (students list scoping; results/submission cross-tenant detail 404;
#    attendance cross-tenant write 404).
# Billing isolation — IMPLEMENTED in billing_school/tests_tenant_isolation.py
#   (FeeStructure list scoping + cross-tenant detail 404).
# Conversations isolation — IMPLEMENTED in conversations/tests_tenant_isolation.py
#   (thread list scoping + messages not readable cross-tenant).


class LibraryGamificationIsolationTests(TwoTenantAPITestCase):
    @skip(_TODO)
    def test_library_catalog_scoped(self):
        # GET /api/library/... as A excludes B's catalog/checkouts.
        ...

    @skip(_TODO)
    def test_gamification_leaderboard_scoped(self):
        # GET /api/gamification/... as A excludes B's students/points.
        ...


class ProjectsIsolationTests(TwoTenantAPITestCase):
    @skip(_TODO)
    def test_projects_scoped_and_feature_gated(self):
        # /api/projects/ gated by tenant.features['projects']; when enabled for
        # both A and B, A must not see B's projects.
        ...


# Async (Celery) tenant context — IMPLEMENTED in
#   notifications/tests_tenant_isolation.py::CeleryTenantContextIsolationTests
#   (task dispatched for B writes to B, not the ambient schema).
# WebSocket isolation — IMPLEMENTED in:
#   notifications/tests_tenant_isolation.py::WebSocketNotificationIsolationTests
#     (UUID-pk notification groups never deliver cross-user/cross-tenant);
#   users/tests_tenant_isolation.py::WsTicketTenantBindingTests
#     (ws-ticket carries the minting tenant's schema, not another's).
