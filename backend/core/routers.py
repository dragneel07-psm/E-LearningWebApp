from django.conf import settings
from .middleware.tenant import get_current_db_alias

class TenantDatabaseRouter:
    """
    A router to control all database operations on models in the
    tenant applications.
    """

    def db_for_read(self, model, **hints):
        """
        Attempts to read tenant models go to tenant database.
        """
        # SaaS-level billing models are shared
        if model._meta.app_label == 'billing' and model.__name__ in ['Subscription', 'SubscriptionPlan', 'Invoice']:
            return 'default'

        # Force Tenant and GlobalSettings to default
        if model._meta.app_label == 'core' and model.__name__ in ['Tenant', 'GlobalSettings']:
            return 'default'
            
        if model._meta.app_label in settings.TENANT_APPS:
            return get_current_db_alias()
        return 'default'

    def db_for_write(self, model, **hints):
        """
        Attempts to write tenant models go to tenant database.
        """
        # SaaS-level billing models are shared
        if model._meta.app_label == 'billing' and model.__name__ in ['Subscription', 'SubscriptionPlan', 'Invoice']:
            return 'default'

        # Force Tenant and GlobalSettings to default
        if model._meta.app_label == 'core' and model.__name__ in ['Tenant', 'GlobalSettings']:
            return 'default'

        if model._meta.app_label in settings.TENANT_APPS:
            return get_current_db_alias()
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both models are in the same database.
        """
        # Allow if both models are in SHARED_APPS
        if obj1._meta.app_label in settings.SHARED_APPS and obj2._meta.app_label in settings.SHARED_APPS:
            return True
        
        # Allow if both models are in TENANT_APPS
        if obj1._meta.app_label in settings.TENANT_APPS and obj2._meta.app_label in settings.TENANT_APPS:
            return True

        # Allow relation between Tenant App and Shared App (Cross-DB)
        # Required for Student -> UserAccount, AcademicClass -> Tenant, etc.
        if (obj1._meta.app_label in settings.SHARED_APPS and obj2._meta.app_label in settings.TENANT_APPS) or \
           (obj1._meta.app_label in settings.TENANT_APPS and obj2._meta.app_label in settings.SHARED_APPS):
            return True
             
        return None 

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the auth and contenttypes apps only appear in the
        'default' database.
        """
        # SaaS-level billing models migrate only to default
        if app_label == 'billing' and model_name in ['subscription', 'subscriptionplan', 'invoice']:
            return db == 'default'

        if app_label in settings.TENANT_APPS:
            if db == 'default':
                return app_label in settings.SHARED_APPS
            else:
                return app_label in settings.TENANT_APPS
        
        # Shared apps only on default
        if app_label in settings.SHARED_APPS:
            return db == 'default'

        return None
