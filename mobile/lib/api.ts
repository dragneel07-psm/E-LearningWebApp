import * as SecureStore from 'expo-secure-store';

// ─── Configuration ────────────────────────────────────────────
// Change this to your backend server IP (find it with `ipconfig` on Windows or `ifconfig` on Mac)
// When running on a physical device, use your computer's local IP, NOT localhost
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:8000/api';

// ─── Types (mirrored from web frontend/lib/api.ts) ────────────
export interface User {
    user_id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'student' | 'teacher' | 'parent' | 'admin' | 'saas_admin';
    tenant: string;
    is_active?: boolean;
    phone_number?: string;
    bio?: string;
}

export interface Subject {
    id: number;
    name: string;
    code?: string;
    academic_class: number;
    description?: string;
    is_elective: boolean;
    teacher_name?: string;
    total_lessons?: number;
    completed_lessons?: number;
    progress_percentage?: number;
}

export interface Chapter {
    id: number;
    subject: number;
    title: string;
    description?: string;
    order: number;
    is_published: boolean;
    lessons?: Lesson[];
}

export interface Lesson {
    id: number;
    chapter: number;
    title: string;
    content_type: 'text' | 'video' | 'interactive' | 'quiz';
    content?: string;
    video_url?: string | null;
    order: number;
    is_published: boolean;
    duration_minutes: number;
    completed?: boolean;
}

export interface Assessment {
    id: string;
    assessment_id: string;
    title: string;
    description: string;
    type: 'quiz' | 'exam' | 'assignment';
    total_marks: number;
    duration_minutes: number;
    due_date: string;
}

export interface Notice {
    id?: number;
    title: string;
    content: string;
    category: string;
    priority: 'low' | 'normal' | 'high';
    published_date?: string;
}

export interface Student {
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    academic_class: number | null;
    current_streak: number;
    total_minutes_learned: number;
    focus_score: number;
}

export interface Attendance {
    attendance_id: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    subject_name?: string;
}

export interface Grade {
    id: string;
    assessment_title?: string;
    score: number;
    total_marks?: number;
    submitted_at: string;
    ai_feedback?: string;
}

export interface LoginResponse {
    access: string;
    refresh: string;
    user: User;
    tenant: string;
}

// ─── Auth Helpers ─────────────────────────────────────────────
export async function getAuthToken(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync('access_token');
    } catch {
        return null;
    }
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
}

export async function clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
}

export async function getTenantId(): Promise<string> {
    const tenant = await SecureStore.getItemAsync('tenant_id');
    return tenant || 'demo';
}

export async function saveTenantId(tenantId: string): Promise<void> {
    await SecureStore.setItemAsync('tenant_id', tenantId);
}

// ─── Core API Request ─────────────────────────────────────────
export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = await getAuthToken();
    const tenantId = await getTenantId();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorText = await response.text();
        let message = `API Error ${response.status}`;
        try {
            const errorData = JSON.parse(errorText);
            message = errorData.detail || errorData.message || message;
        } catch { }
        throw new Error(message);
    }

    if (response.status === 204) return {} as T;
    return response.json();
}

// ─── Auth API ─────────────────────────────────────────────────
export const authAPI = {
    login: async (username: string, password: string, subdomain: string): Promise<LoginResponse> => {
        const response = await fetch(`${API_BASE_URL}/users/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': subdomain,
            },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Login failed. Check credentials.');
        }
        return response.json();
    },
};

// ─── Users API ────────────────────────────────────────────────
export const usersAPI = {
    getMe: () => apiRequest<User>('/users/accounts/me/'),
};

// ─── Academic API ─────────────────────────────────────────────
export const academicAPI = {
    getMyStudent: () => apiRequest<Student>('/academic/students/me/'),
    getSubjects: (studentId: string) =>
        apiRequest<Subject[]>(`/academic/students/${studentId}/subjects/`),
    getChapters: (subjectId: number) =>
        apiRequest<Chapter[]>(`/academic/chapters/?subject=${subjectId}`),
    getAssessments: () => apiRequest<Assessment[]>('/academic/assessments/'),
    getGrades: () => apiRequest<Grade[]>('/academic/results/'),
    getAttendance: () => apiRequest<Attendance[]>('/academic/attendance/'),
    getNotices: () => apiRequest<Notice[]>('/academic/notices/'),
};
