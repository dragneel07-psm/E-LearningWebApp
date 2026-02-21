#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    try:
        execute_from_command_line(sys.argv)
    except Exception as e:
        import sys
        print(f"FATAL ERROR CAUGHT IN manage.py:", file=sys.stderr)
        try:
            from django.conf import settings
            print(f"DATABASES IS: {settings.DATABASES['default']}", file=sys.stderr)
        except Exception:
            print("Could not dump settings", file=sys.stderr)
        print(f"OS ENV DATABASE_URL: {os.environ.get('DATABASE_URL')}", file=sys.stderr)
        print(f"OS ENV PGVARS: {[k for k in os.environ.keys() if 'PG' in k]}", file=sys.stderr)
        raise e

if __name__ == "__main__":
    main()
