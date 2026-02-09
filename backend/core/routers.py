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
        db = 'default'
        # Shared Apps logic
        tenant_apps = [app.split('.')[0] for app in settings.TENANT_APPS]
        
        # SaaS-level models are shared
        if model._meta.app_label == 'billing' and model.__name__ in ['Subscription', 'SubscriptionPlan', 'Invoice']:
            db = 'default'
        # Force Tenant, UserAccount, and GlobalSettings to default
        elif model._meta.app_label == 'core' and model.__name__ in ['Tenant', 'GlobalSettings']:
            db = 'default'
        elif model._meta.app_label == 'users':
            db = 'default'
        elif model._meta.app_label == 'conversations':
            db = 'default'
        elif model._meta.app_label in settings.TENANT_APPS or model._meta.app_label in tenant_apps:
            db = get_current_db_alias()
        
        return db

    def db_for_write(self, model, **hints):
        """
        Attempts to write tenant models go to tenant database.
        """
        db = 'default'
        tenant_apps = [app.split('.')[0] for app in settings.TENANT_APPS]

        # SaaS-level models are shared
        if model._meta.app_label == 'billing' and model.__name__ in ['Subscription', 'SubscriptionPlan', 'Invoice']:
            db = 'default'
        # Force Tenant, UserAccount, and GlobalSettings to default
        elif model._meta.app_label == 'core' and model.__name__ in ['Tenant', 'GlobalSettings']:
            db = 'default'
        elif model._meta.app_label == 'users':
            db = 'default'
        elif model._meta.app_label == 'conversations':
            db = 'default'
        elif model._meta.app_label in settings.TENANT_APPS or model._meta.app_label in tenant_apps:
            db = get_current_db_alias()
            
        return db

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if both models are in the same database or are linked shared/tenant apps.
        """
        app1 = obj1._meta.app_label
        app2 = obj2._meta.app_label
        
        shared_apps = [app.split('.')[0] for app in settings.SHARED_APPS]
        tenant_apps = [app.split('.')[0] for app in settings.TENANT_APPS]

        # Allow if both models are in SHARED_APPS
        if (app1 in settings.SHARED_APPS or app1 in shared_apps) and \
           (app2 in settings.SHARED_APPS or app2 in shared_apps):
            return True
        
        # Allow if both models are in TENANT_APPS
        if (app1 in settings.TENANT_APPS or app1 in tenant_apps) and \
           (app2 in settings.TENANT_APPS or app2 in tenant_apps):
            return True

        # Allow relation between Tenant App and Shared App (Cross-DB)
        if ((app1 in settings.SHARED_APPS or app1 in shared_apps) and (app2 in settings.TENANT_APPS or app2 in tenant_apps)) or \
           ((app1 in settings.TENANT_APPS or app1 in tenant_apps) and (app2 in settings.SHARED_APPS or app2 in shared_apps)):
            return True
             
        return None 

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Control which apps are migrated to which database.
        """
        # SaaS-level billing models migrate only to default
        if app_label == 'billing' and model_name in ['subscription', 'subscriptionplan', 'invoice']:
            return db == 'default'

        tenant_apps = [app.split('.')[0] for app in settings.TENANT_APPS]
        if app_label in settings.TENANT_APPS or app_label in tenant_apps:
            if db == 'default':
                shared_apps = [app.split('.')[0] for app in settings.SHARED_APPS]
                return app_label in settings.SHARED_APPS or app_label in shared_apps
            else:
                return True
        
        # Shared apps only on default
        shared_apps = [app.split('.')[0] for app in settings.SHARED_APPS]
        if app_label in settings.SHARED_APPS or app_label in shared_apps:
            return db == 'default'

        return None
