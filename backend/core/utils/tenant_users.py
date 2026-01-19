from users.models import UserAccount

def create_tenant_admin(tenant, email, password, first_name, last_name):
    """
    Creates the first admin user for a tenant in the tenant's database.
    Using db_manager(alias) to target specific DB.
    """
    print(f"Creating admin user in {tenant.db_alias}...")
    try:
        user = UserAccount.objects.db_manager(tenant.db_alias).create_user(
            email=email,
            username=email.split('@')[0],
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='admin',
            tenant=tenant 
        )
        print(f"Created admin user: {user.email} (ID: {user.pk}) in {tenant.db_alias}")
        return user
    except Exception as e:
        print(f"Failed to create admin user: {e}")
        raise e
