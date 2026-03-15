/**
 * QA-07 — Gamification CRUD
 * ==========================
 * Tests:
 *   ✓ Admin: create badge
 *   ✓ Admin: list badges
 *   ✓ Admin: update badge
 *   ✓ Admin: delete badge
 *   ✓ Student: view leaderboard
 *   ✓ Student: view own badges
 *   ✓ Student: view available badges
 *   ✓ Student: view gamification profile
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, apiGet, apiPost, apiPatch, apiDelete,
  authHeaders, API_URL, QA_TENANT,
} from './helpers';

test.describe('Gamification CRUD', () => {

  // ── Admin: Badge CRUD ─────────────────────────────────────────────────────
  test.describe('Admin — Badge CRUD', () => {
    let badgeId: string;

    test('create badge', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const created = await apiPost(request, tokens, '/api/gamification/available-badges/', {
        name: 'QA Gold Star',
        description: 'Awarded by QA for excellent performance.',
        icon_name: 'star',
        criteria_type: 'perfect_score',
        criteria_value: 1,
        xp_reward: 200,
      }) as Record<string, unknown>;
      expect(created.name).toBe('QA Gold Star');
      badgeId = created.id as string;
    });

    test('list all badges', async ({ request }) => {
      const tokens = await loginAs(request, 'admin');
      const body = await apiGet(request, tokens, '/api/gamification/available-badges/');
      expect(body).toBeTruthy();
    });

    test('update badge', async ({ request }) => {
      if (!badgeId) test.skip();
      const tokens = await loginAs(request, 'admin');
      const updated = await apiPatch(request, tokens, `/api/gamification/available-badges/${badgeId}/`, {
        xp_reward: 250,
        description: 'QA updated badge description.',
      }) as Record<string, unknown>;
      expect(updated.xp_reward).toBe(250);
    });

    test('delete badge', async ({ request }) => {
      if (!badgeId) test.skip();
      const tokens = await loginAs(request, 'admin');
      await apiDelete(request, tokens, `/api/gamification/available-badges/${badgeId}/`);
    });
  });

  // ── Student: read gamification ────────────────────────────────────────────
  test.describe('Student — Gamification Views', () => {
    test('view leaderboard', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const body = await apiGet(request, tokens, '/api/gamification/leaderboard/');
      expect(body).toBeTruthy();
    });

    test('view available badges', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const body = await apiGet(request, tokens, '/api/gamification/available-badges/');
      expect(body).toBeTruthy();
    });

    test('view own badges', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const body = await apiGet(request, tokens, '/api/gamification/student-badges/');
      expect(body).toBeTruthy();
    });

    test('view own gamification profile', async ({ request }) => {
      const tokens = await loginAs(request, 'student');
      const res = await request.get(`${API_URL}/api/gamification/profile/`, {
        headers: authHeaders(tokens),
      });
      expect([200, 404]).toContain(res.status());
    });
  });
});
