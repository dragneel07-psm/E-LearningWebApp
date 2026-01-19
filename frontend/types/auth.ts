export interface LoginCredentials {
    email: string;
    password: string;
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
}

export interface RegisterResponse {
    message: string;
    user: UserProfile;
    tokens: AuthTokens;
}

export interface LoginResponse {
    access: string;
    refresh: string;
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
