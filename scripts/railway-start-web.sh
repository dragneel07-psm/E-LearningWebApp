#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
MIGRATION_VERBOSITY="${MIGRATION_VERBOSITY:-0}"

resolve_python_bin() {
  if [ -n "${PY_BIN:-}" ] && [ -x "${PY_BIN}" ]; then
    echo "${PY_BIN}"
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi
  if [ -x "/usr/local/bin/python" ]; then
    echo "/usr/local/bin/python"
    return 0
  fi
  if [ -x "/opt/venv/bin/python" ]; then
    echo "/opt/venv/bin/python"
    return 0
  fi
  echo "Unable to locate python binary. Set PY_BIN explicitly." >&2
  exit 1
}

resolve_gunicorn_bin() {
  if [ -n "${GUNICORN_BIN:-}" ] && [ -x "${GUNICORN_BIN}" ]; then
    echo "${GUNICORN_BIN}"
    return 0
  fi
  if command -v gunicorn >/dev/null 2>&1; then
    command -v gunicorn
    return 0
  fi
  if [ -x "/usr/local/bin/gunicorn" ]; then
    echo "/usr/local/bin/gunicorn"
    return 0
  fi
  if [ -x "/opt/venv/bin/gunicorn" ]; then
    echo "/opt/venv/bin/gunicorn"
    return 0
  fi
  echo "Unable to locate gunicorn binary. Set GUNICORN_BIN explicitly." >&2
  exit 1
}

PY_BIN="$(resolve_python_bin)"
GUNICORN_BIN="$(resolve_gunicorn_bin)"

cd backend

# Keep schema migrations + bootstrap idempotent for zero-touch deployments.
# --shared already migrates the public schema; no need to run --schema=public again.
"${PY_BIN}" manage.py migrate_schemas --shared --noinput --verbosity="${MIGRATION_VERBOSITY}"
"${PY_BIN}" manage.py migrate_schemas --tenant --noinput --verbosity="${MIGRATION_VERBOSITY}"
"${PY_BIN}" manage.py init_prod

exec "${GUNICORN_BIN}" config.wsgi --bind "0.0.0.0:${PORT}"
