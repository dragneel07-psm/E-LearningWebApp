#!/usr/bin/env bash
set -euo pipefail

CELERY_BIN="${CELERY_BIN:-/opt/venv/bin/celery}"
CELERY_LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"
CELERY_WORKER_CONCURRENCY="${CELERY_WORKER_CONCURRENCY:-2}"

cd backend
exec "${CELERY_BIN}" -A config.celery:app worker --loglevel="${CELERY_LOG_LEVEL}" --concurrency="${CELERY_WORKER_CONCURRENCY}"
