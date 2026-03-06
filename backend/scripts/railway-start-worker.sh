#!/usr/bin/env bash
set -euo pipefail

CELERY_BIN="${CELERY_BIN:-/opt/venv/bin/celery}"
CELERY_LOG_LEVEL="${CELERY_LOG_LEVEL:-info}"
CELERY_WORKER_CONCURRENCY="${CELERY_WORKER_CONCURRENCY:-2}"

if [ -f manage.py ]; then
  APP_DIR="."
elif [ -f backend/manage.py ]; then
  APP_DIR="backend"
else
  echo "manage.py not found from $(pwd)" >&2
  exit 1
fi

cd "${APP_DIR}"
exec "${CELERY_BIN}" -A config.celery:app worker --loglevel="${CELERY_LOG_LEVEL}" --concurrency="${CELERY_WORKER_CONCURRENCY}"
