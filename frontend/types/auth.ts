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
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
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
