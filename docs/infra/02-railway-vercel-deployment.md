# Railway + Vercel Deployment Procedure

This runbook prepares and deploys:
- Backend (`Django + DRF + django-tenants`) on Railway
- Frontend (`Next.js`) on Vercel

## 1. Pre-Deployment Checklist

- `main` branch is green in CI.
- Backend health endpoints are reachable locally:
  - `/healthz`
  - `/readyz`
- Production tenant policy understood:
  - `x-tenant-id` is ignored in production.
  - tenant resolution is domain/hostname based only.
- You have DNS access for:
  - API domain (Railway)
  - App domain (Vercel)

## 2. Repo Readiness (already applied)

- Railway/Nixpacks install dependencies from `backend/requirements.txt` (not root requirements).
- Web start command uses [`scripts/railway-start-web.sh`](/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/scripts/railway-start-web.sh).
- Worker start command uses [`scripts/railway-start-worker.sh`](/Users/pramodsinghmanyal/Desktop/E-LearningWebApp/scripts/railway-start-worker.sh).
- `Procfile` includes both `web` and `worker`.

## 3. Deploy Backend to Railway

## 3.1 Create Railway Services

Create one Railway project with these services:
1. `backend-web` (from this GitHub repo)
2. `backend-worker` (same repo)
3. PostgreSQL plugin
4. Redis plugin

Use the same code branch for both web and worker services.

## 3.2 Railway Commands

For `backend-web`:
- Build command: from `railway.toml`
- Start command: `bash scripts/railway-start-web.sh`

For `backend-worker`:
- Build command: same as web
- Start command: `bash scripts/railway-start-worker.sh`

## 3.3 Required Backend Environment Variables

Set these on both `backend-web` and `backend-worker`:

```bash
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com
TIME_ZONE=Asia/Kathmandu
FRONTEND_URL=https://yourdomain.com

DATABASE_URL=<from Railway Postgres>
REDIS_URL=<from Railway Redis>
ASYNC_TASK_BACKEND=celery
CELERY_BROKER_URL=<same as REDIS_URL>
CELERY_RESULT_BACKEND=<same as REDIS_URL>

TENANT_HEADER_TRUST_MODE=never

CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
```

Optional but recommended:

```bash
SENTRY_DSN=...
SECURE_SSL_REDIRECT=true
SECURE_HSTS_SECONDS=2592000
SECURE_HSTS_INCLUDE_SUBDOMAINS=true
```

## 3.4 Domain Setup (critical for tenants)

Because production is domain-resolved:
- Add tenant domains in your `Domain` table.
- Ensure incoming hostnames to Railway match those tenant domains.

For SaaS/public flows, keep a public domain (for example `api.yourdomain.com`) mapped to `public`.

## 4. Deploy Frontend to Vercel

## 4.1 Vercel Project Setup

1. Create/import project from same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Next.js (already in `frontend/vercel.json`).

## 4.2 Frontend Environment Variables

Set in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

If you use analytics:

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## 4.3 Frontend Domain

- Add custom domain in Vercel (for example `yourdomain.com`).
- Update backend CORS/CSRF allowlists with the final Vercel domain.

## 5. Post-Deploy Smoke Test

Run in order:
1. `GET https://api.yourdomain.com/healthz` -> `200`
2. `GET https://api.yourdomain.com/readyz` -> `200`
3. Login from frontend
4. Verify one async endpoint:
   - queue job
   - poll `/api/core/jobs/{job_id}/`
5. Verify worker logs show task consumption.

## 6. Rollback Procedure

1. In Railway + Vercel, redeploy previous successful commit.
2. If migration-related issue:
   - pause deploy
   - inspect migration history
   - restore DB backup if needed
3. Keep worker disabled temporarily if queue-related errors cascade.

## 7. Common Pitfalls

- Missing `ALLOWED_HOSTS` with `DEBUG=False` will crash startup by design.
- Deploying only web without worker keeps queue tasks pending.
- Tenant routes will fail if domain records are not created per tenant host.
- If frontend domain changes, update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.
