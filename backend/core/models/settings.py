from django.db import models

class GlobalSettings(models.Model):
    """
    Singleton model to store global system settings for the SaaS platform.
    Examples: Maintenance mode, site name, support email.
    """
    site_name = models.CharField(max_length=255, default="E-Learning SaaS")
    maintenance_mode = models.BooleanField(default=False, help_text="If active, only admins can access the site.")
    allow_registration = models.BooleanField(default=True, help_text="Allow new tenants/schools to register.")
    support_email = models.EmailField(default="support@example.com")
    default_language = models.CharField(max_length=10, default="en", choices=[('en', 'English'), ('es', 'Spanish'), ('fr', 'French')])
    
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and GlobalSettings.objects.exists():
            # If you try to save a new instance but one exists, update the existing one instead
            existing = GlobalSettings.objects.first()
            self.pk = existing.pk
        return super(GlobalSettings, self).save(*args, **kwargs)

    def __str__(self):
        return "Global Settings"

    class Meta:
        verbose_name = "Global Settings"
        verbose_name_plural = "Global Settings"
