#!/usr/bin/env bash
set -euo pipefail

PY_BIN="${PY_BIN:-/opt/venv/bin/python}"
GUNICORN_BIN="${GUNICORN_BIN:-/opt/venv/bin/gunicorn}"
PORT="${PORT:-8000}"

if [ -f manage.py ]; then
  APP_DIR="."
elif [ -f backend/manage.py ]; then
  APP_DIR="backend"
else
  echo "manage.py not found from $(pwd)" >&2
  exit 1
fi

cd "${APP_DIR}"

"${PY_BIN}" manage.py migrate_schemas --shared --noinput
"${PY_BIN}" manage.py migrate_schemas --schema=public --noinput
"${PY_BIN}" manage.py migrate_schemas --tenant --noinput
"${PY_BIN}" manage.py init_prod

exec "${GUNICORN_BIN}" config.wsgi --bind "0.0.0.0:${PORT}"
