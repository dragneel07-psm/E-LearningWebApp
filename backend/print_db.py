import os
import sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@host:123/dbname")
import django
django.setup()
from django.conf import settings
print(settings.DATABASES)
