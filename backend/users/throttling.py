from rest_framework.throttling import ScopedRateThrottle


class LoginRateThrottle(ScopedRateThrottle):
    scope = "auth_login"


class RefreshRateThrottle(ScopedRateThrottle):
    scope = "auth_refresh"


class RegisterRateThrottle(ScopedRateThrottle):
    scope = "auth_register"


class PasswordResetRateThrottle(ScopedRateThrottle):
    scope = "auth_password_reset"


class PasswordResetConfirmRateThrottle(ScopedRateThrottle):
    scope = "auth_password_reset_confirm"
