import urllib.parse
from django.conf import settings

url = 'postgresql://postgres:juKGWxVyqjOzePLtIlWsxWNsWdCAbBnr@e-learningwebapp.railway.internal:5432/'

def parse_db_url(url):
    import dj_database_url
    d = dj_database_url.parse(url, engine='django_tenants.postgresql_backend')
    
    # Robust fix
    if not d.get("NAME") or d.get("NAME") == "":
        d["NAME"] = "elearning"
    
    return d

print(parse_db_url(url))
