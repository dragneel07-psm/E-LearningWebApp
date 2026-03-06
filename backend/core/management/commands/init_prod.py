import os
from urllib.parse import urlsplit

from django.core.management.base import BaseCommand

from core.models.tenant import Domain, Tenant


def _csv_env_list(key: str) -> list[str]:
    raw = os.environ.get(key, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _normalize_domain(value: str) -> str:
    host = (value or "").strip().lower()
    if not host:
        return ""
    if "://" in host:
        parsed = urlsplit(host)
        host = parsed.netloc or parsed.path
    host = host.split("/", 1)[0].split(":", 1)[0].strip(".")
    return host

class Command(BaseCommand):
    help = 'Initializes the production public tenant and domain'

    def handle(self, *args, **options):
        self.stdout.write("Checking for public tenant...")
        
        # 1. Ensure Public Tenant exists
        tenant, created = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Global Admin App',
                'type': 'premium',
                'status': 'active'
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('✅ Created public tenant.'))
        else:
            self.stdout.write(self.style.NOTICE('ℹ️ Public tenant already exists.'))

        # 2. Ensure public domains exist (dynamic from env + legacy fallback + localhost).
        candidates = [
            os.environ.get("PRIMARY_PUBLIC_DOMAIN", ""),
            os.environ.get("RAILWAY_PUBLIC_DOMAIN", ""),
            os.environ.get("RAILWAY_SERVICE_E_LEARNINGWEBAPP_URL", ""),
            'e-learningwebapp-production-1112.up.railway.app',  # legacy fallback
        ]
        candidates.extend(_csv_env_list("PUBLIC_DOMAINS"))
        candidates.extend(["localhost", "127.0.0.1"])

        domains: list[str] = []
        seen: set[str] = set()
        for candidate in candidates:
            domain = _normalize_domain(candidate)
            if not domain or domain in seen:
                continue
            domains.append(domain)
            seen.add(domain)

        primary_domain = next((d for d in domains if d not in {"localhost", "127.0.0.1"}), "localhost")
        
        for d in domains:
            domain, d_created = Domain.objects.update_or_create(
                domain=d,
                defaults={'tenant': tenant, 'is_primary': (d == primary_domain)}
            )
            if d_created:
                self.stdout.write(self.style.SUCCESS(f'✅ Created domain: {d}'))
            else:
                self.stdout.write(self.style.SUCCESS(f'✅ Verified/Updated domain: {d}'))
        
        self.stdout.write(self.style.SUCCESS('🚀 Production initialization complete.'))
