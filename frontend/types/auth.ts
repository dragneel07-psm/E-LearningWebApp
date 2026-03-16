export interface LoginCredentials {
    email: string;
    password: string;
    school_code?: string; // maps to x-tenant-id header
}

export interface RegisterData {
    email: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
    role?: 'student' | 'teacher' | 'parent';
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface UserProfile {
    user_id: string; // Updated to match backend 'user_id'
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant?: string; // If exposed
    tenant_features?: Record<string, any>;
}

export interface RegisterResponse {
    message: string;
    verification_required?: boolean;
    user?: UserProfile;
}

export interface LoginResponse {
    access: string;
    refresh: string;
    user?: {
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
    };
    // SaaS admin 2FA pre-flight fields (no tokens returned in these cases)
    two_factor_required?: boolean;
    action?: 'setup_2fa' | 'enter_totp';
    message?: string;
}

export interface ChangePasswordData {
    old_password: string;
    new_password: string;
}

export interface UpdateProfileData {
    first_name?: string;
    last_name?: string;
    email?: string;
}
