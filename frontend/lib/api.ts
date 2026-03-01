/**
 * API Client for E-Learning SaaS Platform
 * Centralized client for all backend API calls
 */

import { removeTokens } from "./auth";

// API Base Configuration
// API Base Configuration
const getApiBaseUrl = () => {
    // Always point to localhost:8000 for development to avoid networking issues with subdomains
    // The x-tenant-id header handles the multi-tenancy context
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Types for API Responses
export interface Tenant {
    id?: number | string;
    tenant_id: string;
    name: string;
    subdomain: string;
    domain: string | null;
    type: string;
    status: string;
    created_at: string;
    updated_at: string;
    // Profile
    address?: string;
    contact_email?: string;
    contact_phone?: string;
    website?: string;
    current_academic_year?: string;
    established_year?: number;
    logo?: string;
    features?: Record<string, any>;
}

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
    address?: string;
    bio?: string;
    date_of_birth?: string;
    tenant_features?: Record<string, any>;
}


export interface AcademicYear {
    id: number;
    name: string; // e.g. "2023-2024"
    start_date: string;
    end_date: string;
    is_current: boolean;
}


export interface Subject {
    id: number;
    name: string; // e.g. "Mathematics"
    code?: string; // e.g. "MTH101"
    academic_class: number;
    description?: string;
    credits?: number;
    is_elective: boolean;
    teacher?: string | null; // UUID
    teacher_name?: string;
    total_lessons?: number;
    completed_lessons?: number;
    progress_percentage?: number;
    is_active?: boolean;
}

export interface Section {
    id: number;
    name: string;
    capacity: number;
}

export interface AcademicClass {
    id: number;
    name: string; // e.g. "Grade 10"
    order: number;
    sections?: Section[];
    subjects?: Subject[]; // Read-only from API
}

export interface Student {
    id: string; // UUID (usually maps to student_id or pk)
    student_id: string; // Explicitly from some serializers
    user_id: string; // UUID
    email: string;
    username?: string;
    first_name: string;
    last_name: string;
    academic_class: number | null;
    section: number | null;
    parent_email?: string;
    password?: string;

    // Gamification
    current_streak: number;
    total_minutes_learned: number;
    focus_score: number;

    // Preferences
    learning_style?: 'visual' | 'reading' | 'practice';
    daily_study_goal?: number;
    ai_explanation_level?: 'simple' | 'normal' | 'exam';
    language_preference?: string;
    is_active?: boolean;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon_name: string;
    criteria_type: string;
    criteria_value: number;
    xp_reward: number;
}

export interface StudentBadge {
    id: string;
    badge: string;
    badge_details?: Badge;
    earned_at: string;
}

export interface PointTransaction {
    id: string;
    points: number;
    description: string;
    activity_type: string;
    timestamp: string;
}

export interface Teacher {
    id: string; // UUID
    user_id: string; // UUID
    email: string;
    username?: string;
    first_name: string;
    last_name: string;
    assigned_classes: number[];
    designation?: string;
    is_active?: boolean;
    password?: string; // For creation
}

export interface Parent {
    parent_id: string;
    user: User;
    students: Student[];
}

// Course interface removed in favor of Subject

// ... existing Lesson ...

export interface Assessment {
    id: string;
    assessment_id: string;
    subject: number | string;
    subject_name?: string;
    title: string;
    description: string;
    type: 'quiz' | 'exam' | 'assignment';
    total_marks: number;
    passing_marks: number;
    duration_minutes: number;
    blooms_level: string;
    due_date: string;
    scheduled_at?: string;
    questions?: Question[];
}

export interface Result {
    id: string;
    result_id: string;
    assessment: string;
    assessment_title?: string;
    student: string;
    student_name?: string;
    score: number;
    time_taken_minutes: number;
    submitted_at: string;
    ai_feedback?: string;
    teacher_feedback?: string;
    graded_by?: string;
    answers_data?: any;
}

export interface GradebookData {
    assessments: {
        id: string;
        title: string;
        total_marks: number;
        type: string;
    }[];
    students: {
        id: string;
        name: string;
        email: string;
        results: Record<string, {
            score: number | null;
            result_id: string | null;
            submitted_at: string | null;
        }>;
    }[];
}

export interface Submission {
    id: string;
    submission_id: string;
    assessment: string;
    student: string;
    content?: string;
    file_url?: string;
    submitted_at: string;
    status: 'draft' | 'submitted' | 'graded' | 'late';
    is_graded: boolean;
    result?: Result;
}

export interface Exam {
    exam_id: string;
    assessment: string;
    assessment_details?: Assessment;
    hall_ticket_prefix: string;
    exam_center?: string;
    seating_capacity: number;
    instructions?: string;
    is_published: boolean;
    results_released: boolean;
    seating_arrangements?: ExamSeating[];
    created_at: string;
    updated_at: string;
}

export interface ExamSeating {
    seating_id: string;
    exam: string;
    student: string;
    student_name?: string;
    student_id_code?: string;
    hall_ticket_number: string;
    room_number: string;
    seat_number: string;
    attendance_status: 'present' | 'absent' | 'late';
}

export interface Chapter {
    id: number;
    subject: number;
    title: string;
    description?: string;
    order: number;
    is_published: boolean;
    lessons?: Lesson[];
    created_at?: string;
}

export interface LessonProgress {
    id: number;
    student: string;
    lesson: number;
    completed: boolean;
    last_accessed: string;
    completed_at?: string | null;
}

export interface Lesson {
    id: number;
    chapter: number;
    title: string;
    content_type: 'text' | 'video' | 'interactive' | 'quiz';
    content?: string;
    video_url?: string | null;
    interactive_data?: any;
    assessment?: string;
    order: number;
    is_published: boolean;
    duration_minutes: number;
    materials?: LessonMaterial[];
    user_progress?: LessonProgress | null;
    completed?: boolean; // Convenience field for list views
    created_at?: string;
    updated_at?: string;
}

export interface LessonMaterial {
    id: number;
    lesson: number;
    title: string;
    file?: string;
    link?: string;
    material_type: 'pdf' | 'image' | 'video' | 'link' | 'other';
    created_at?: string;
}

export interface Question {
    id: string;
    question_id: string;
    assessment: string;
    text: string;
    type: 'mcq' | 'short_answer' | 'long_answer' | 'code';
    options: string[];
    correct_answer?: string;
    points: number;
    order: number;
}

export interface LearningNode {
    id: string;
    learning_path: string;
    title: string;
    description?: string;
    order: number;
    resource_type: 'video' | 'article' | 'quiz' | 'assignment' | 'topic';
    resource_link?: string;
    lesson?: number;
    estimated_minutes: number;
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    completed_at?: string;
}

export interface LearningPath {
    id: string;
    tenant: string;
    student: string;
    subject?: number | null;
    title: string;
    description?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    generated_by_ai: boolean;
    nodes: LearningNode[];
}

// (Moved definitions to top)

export interface Subscription {
    id: string;
    subscription_id: string;
    tenant: string;
    plan: string;
    active: boolean;
    student_limit: number;
    storage_limit_gb: number;
    ai_token_limit: number;
}

export interface SubscriptionPlan {
    id: string;
    plan_id: string;
    name: string;
    description?: string;
    price_monthly: number;
    price_yearly: number;
    currency?: string;
    student_limit: number;
    teacher_limit: number;
    storage_limit_gb: number;
    ai_token_limit: number;
    has_ai_tutor?: boolean;
    has_ai_eval?: boolean;
    has_parent_portal?: boolean;
    has_analytics?: boolean;
    has_career_guidance?: boolean;
    is_active: boolean;
}

export interface Invoice {
    invoice_id: string;
    tenant: string;
    tenant_name?: string;
    subscription?: string;
    plan_name?: string;
    amount: string;
    status: 'pending' | 'paid' | 'failed';
    issued_date: string;
    due_date?: string;
}

export interface GlobalSettings {
    site_name: string;
    support_email: string;
    default_language: string;
    maintenance_mode: boolean;
    allow_registration: boolean;
}

export interface AuditLog {
    id: number | string;
    action: string;
    actor?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
}

export interface SystemStatus {
    status: string;
    latency: string;
    storage: {
        total: string;
        used: string;
        free: string;
        percent: number;
    };
}

export interface Group {
    id: number;
    name: string;
}

export interface Permission {
    id: number;
    name: string;
    codename: string;
}

export interface GradeResult {
    score: number;
    feedback: string;
    tokens_used?: number;
}

export interface Conversation {
    conversation_id: string;
    type: 'direct' | 'group';
    title?: string;
    participants: ConversationParticipant[];
    last_message?: Message;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface ConversationParticipant {
    user: string;
    user_details: {
        id: string;
        email: string;
        full_name: string;
        role: string;
    };
    joined_at: string;
    last_read_at: string;
}

export interface Message {
    message_id: string;
    conversation: string;
    sender: string;
    sender_details: {
        id: string;
        email: string;
        full_name: string;
        role: string;
    };
    content: string;
    is_system_message: boolean;
    created_at: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface Timetable {
    timetable_id: number;
    academic_class: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    room_number: string;
    teacher: string | null;
    teacher_name?: string; // Optional expansion
}

export interface Attendance {
    attendance_id: number;
    student: string;
    academic_class: string;
    subject: number;
    date: string;
    status: 'present' | 'absent' | 'late';
    remarks?: string;
    subject_name?: string; // Correctly maps to backend
}

export interface FeeStructure {
    fee_id: string;
    tenant: string;
    name: string;
    amount: number;
    academic_class?: number | null;
    frequency: 'monthly' | 'one_time' | 'annual' | 'term';
    created_at: string;
}

export interface StudentFee {
    student_fee_id: string;
    tenant: string;
    student: string;
    student_name?: string;
    fee_structure: string;
    fee_name?: string;
    amount_due: number;
    amount_paid: number;
    balance?: number;
    due_date: string;
    status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id?: string;
    payment_id: string;
    tenant: string;
    student: string;
    student_name?: string;
    student_fee?: string | null;
    amount: number;
    payment_date: string;
    method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'card';
    payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'card';
    transaction_id?: string;
    recorded_by?: string;
    recorded_by_name?: string;
    remarks?: string;
}

export interface Expense {
    expense_id: string;
    tenant: string;
    title: string;
    amount: number;
    category: 'salary' | 'maintenance' | 'utilities' | 'supplies' | 'events' | 'transport' | 'other';
    date: string;
    description?: string;
    recorded_by?: string;
    recorded_by_name?: string;
    created_at: string;
}

export interface FinanceDashboard {
    total_revenue: number;
    total_pending: number;
    total_expenses: number;
    net_balance: number;
    recent_payments: Payment[];
    recent_expenses: Expense[];
}

export interface Book {
    book_id: string;
    title: string;
    author: string;
    isbn?: string;
    category: string;
    publisher?: string;
    published_year?: number;
    total_copies: number;
    available_copies: number;
    description?: string;
    cover_image?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BookIssue {
    issue_id: string;
    book: string;
    student: string;
    issued_date: string;
    due_date: string;
    return_date?: string;
    status: 'issued' | 'returned' | 'overdue';
    fine_amount: number;
    remarks?: string;
    book_title?: string;
    book_author?: string;
    student_name?: string;
}

export interface Notification {
    id: number;
    recipient: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export interface Notice {
    id?: number;
    notice_id?: number;
    title: string;
    content: string;
    category: string;
    priority: 'low' | 'normal' | 'high';
    target_audience: 'school' | 'class' | 'student';
    target_class?: string | number | null;
    target_class_name?: string;
    target_student?: string | null;
    published_date?: string;
    expiry_date?: string | null;
    attachment?: string | null;
    attachment_url?: string | null;
}

// Helper function to get auth token
function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('access_token');
    }
    return null;
}

// Generic fetch wrapper with error handling
export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Add tenant context header — dynamically read from localStorage so SaaS users
    // get 'public' and school users get their own tenant slug.
    const storedTenantId = (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null) || 'demo';
    headers['x-tenant-id'] = storedTenantId;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `API Error: ${response.statusText}`;
            let errorDetails = errorBody;

            try {
                const errorData = JSON.parse(errorBody);
                errorDetails = JSON.stringify(errorData);
                if (errorData.detail) errorMessage = errorData.detail;
                else if (typeof errorData === 'object') errorMessage = JSON.stringify(errorData);
            } catch (e) {
                console.warn("API response was not JSON", e);
            }

            console.error('API Error Response:', response.status, errorMessage, errorDetails);

            const error = new Error(errorMessage) as Error & {
                status?: number;
                details?: string;
            };
            error.status = response.status;
            error.details = errorDetails;

            if (response.status === 401) {
                if (typeof window !== 'undefined') {
                    removeTokens();
                    if (!window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login?expired=true';
                    }
                }
            }

            throw error;
        }

        return await response.json();
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('API request failed:', message);
        throw error;
    }
}

// Fetch wrapper for Blobs (PDFs, Excel, etc.)
async function apiRequestBlob(
    endpoint: string,
    options: RequestInit = {}
): Promise<Blob> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        ...options.headers as Record<string, string>,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const blobTenantId = (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null) || 'demo';
    headers['x-tenant-id'] = blobTenantId;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to download file');
    }

    return await response.blob();
}

// Core API
export const coreAPI = {
    getTenants: () => apiRequest<Tenant[]>('/core/tenants/'),
    getTenant: (id: string) => apiRequest<Tenant>(`/core/tenants/${id}/`),
    createTenant: (data: Partial<Tenant>) => apiRequest<Tenant>('/core/tenants/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTenant: (id: string, data: Partial<Tenant>) => apiRequest<Tenant>(`/core/tenants/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    uploadTenantLogo: (id: string, formData: FormData) => apiRequest<Tenant>(`/core/tenants/${id}/`, {
        method: 'PATCH',
        body: formData
    }),
    getAuditLogs: () => apiRequest<AuditLog[]>('/core/audit-logs/'),
    getSystemStatus: () => apiRequest<SystemStatus>('/core/system-status/'),
};

// Users API
export const usersAPI = {
    getAccounts: () => apiRequest<User[]>('/users/accounts/'),
    getMe: () => apiRequest<User>('/users/accounts/me/'),
    getAccount: (id: string) => apiRequest<User>(`/users/accounts/${id}/`),
    createAccount: (data: Partial<User>) => apiRequest<User>('/users/accounts/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAccount: (id: string, data: Partial<User>) => apiRequest<User>(`/users/accounts/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    changeMyPassword: (oldPassword: string, newPassword: string) =>
        apiRequest<{ message: string }>('/users/accounts/change-password/', {
            method: 'POST',
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
        }),
    forgotPassword: (email: string) =>
        apiRequest<{ message: string }>('/users/password-reset/', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),
    confirmPasswordReset: (data: { password: string; token: string; uidb64: string }) =>
        apiRequest<{ message: string }>('/users/password-reset-confirm/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    resetUserPassword: (userId: string, newPassword: string) =>
        apiRequest<{ message: string }>('/users/admin/reset-password/', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, new_password: newPassword })
        }),
    getGroups: () => apiRequest<Group[]>('/users/groups/'),
    getGroup: (id: string | number) => apiRequest<Group>(`/users/groups/${id}/`),
    createGroup: (data: Partial<Group>) => apiRequest<Group>('/users/groups/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateGroup: (id: string | number, data: Partial<Group> | { permission_ids: number[] }) =>
        apiRequest<Group>(`/users/groups/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
    deleteGroup: (id: string | number) => apiRequest<void>(`/users/groups/${id}/`, {
        method: 'DELETE'
    }),
    getPermissions: () => apiRequest<Permission[]>('/users/permissions/'),
};

// Academic API
export const academicAPI = {
    // Academic Years
    getAcademicYears: () => apiRequest<AcademicYear[]>('/academic/years/'),
    getAcademicYear: (id: number) => apiRequest<AcademicYear>(`/academic/years/${id}/`),
    createAcademicYear: (data: Partial<AcademicYear>) => apiRequest<AcademicYear>('/academic/years/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAcademicYear: (id: number, data: Partial<AcademicYear>) => apiRequest<AcademicYear>(`/academic/years/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteAcademicYear: (id: number) => apiRequest<void>(`/academic/years/${id}/`, {
        method: 'DELETE'
    }),

    // Classes
    getClasses: () => apiRequest<AcademicClass[]>('/academic/classes/'),
    getClass: (id: number) => apiRequest<AcademicClass>(`/academic/classes/${id}/`),
    createClass: (data: Partial<AcademicClass>) => apiRequest<AcademicClass>('/academic/classes/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateClass: (id: number, data: Partial<AcademicClass>) => apiRequest<AcademicClass>(`/academic/classes/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteClass: (id: number) => apiRequest<void>(`/academic/classes/${id}/`, {
        method: 'DELETE'
    }),

    // Sections
    createSection: (data: Partial<Section> & { academic_class: number }) => apiRequest<Section>('/academic/sections/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteSection: (id: number) => apiRequest<void>(`/academic/sections/${id}/`, {
        method: 'DELETE'
    }),

    // Subjects
    getSubjects: () => apiRequest<Subject[]>('/academic/subjects/'),
    getSubject: (id: number) => apiRequest<Subject>(`/academic/subjects/${id}/`),
    createSubject: (data: Partial<Subject> & { academic_class: number }) => apiRequest<Subject>('/academic/subjects/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateSubject: (id: number, data: Partial<Subject>) => apiRequest<Subject>(`/academic/subjects/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteSubject: (id: number) => apiRequest<void>(`/academic/subjects/${id}/`, {
        method: 'DELETE'
    }),

    // Reports
    getAttendanceSummaryPdf: (sectionId: number, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return `${API_BASE_URL}/academic/reports/attendance-summary/${sectionId}?${params.toString()}`;
    },

    // Assessments
    getAssessments: () => apiRequest<Assessment[]>('/academic/assessments/'),
    getAssessment: (id: string) => apiRequest<Assessment>(`/academic/assessments/${id}/`),
    createAssessment: (data: Partial<Assessment>) => apiRequest<Assessment>('/academic/assessments/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAssessment: (id: string, data: Partial<Assessment>) => apiRequest<Assessment>(`/academic/assessments/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteAssessment: (id: string) => apiRequest<void>(`/academic/assessments/${id}/`, {
        method: 'DELETE'
    }),
    getAttendanceSummaryExcel: (sectionId: number, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return `/api/academic/reports/attendance-summary-excel/${sectionId}/?${params.toString()}`;
    },
    getStudentPerformancePdf: (studentId: string) => `/api/academic/reports/student-performance/${studentId}/`,
    getStudentPerformanceExcel: (studentId: string) => `/api/academic/reports/student-performance-excel/${studentId}/`,



    // Attendance
    getAttendance: () => apiRequest<Attendance[]>('/academic/attendance/'),
    getMyAttendance: () => apiRequest<Attendance[]>('/academic/attendance/my_attendance/'),
    createAttendance: (data: Partial<Attendance>) => apiRequest<Attendance>('/academic/attendance/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateAttendance: (id: number, data: Partial<Attendance>) => apiRequest<Attendance>(`/academic/attendance/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),

    // Timetable
    getTimetable: () => apiRequest<Timetable[]>('/academic/timetable/'),
    getMyTimetable: () => apiRequest<Timetable[]>('/academic/timetable/my_timetable/'),
    createTimetable: (data: Partial<Timetable>) => apiRequest<Timetable>('/academic/timetable/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTimetable: (id: number, data: Partial<Timetable>) => apiRequest<Timetable>(`/academic/timetable/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteTimetable: (id: number) => apiRequest<void>(`/academic/timetable/${id}/`, {
        method: 'DELETE'
    }),

    // Teachers
    getTeachers: () => apiRequest<Teacher[]>('/academic/teachers/'),
    getTeacher: (id: string) => apiRequest<Teacher>(`/academic/teachers/${id}/`),
    createTeacher: (data: Partial<Teacher> & { password?: string }) => apiRequest<Teacher>('/academic/teachers/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTeacher: (id: string, data: Partial<Teacher>) => apiRequest<Teacher>(`/academic/teachers/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),

    // Stats
    getStats: () => apiRequest<{
        total_teachers: number;
        total_students: number;
        total_classes: number;
        total_subjects: number;
    }>('/academic/stats/'),

    // Students
    getStudents: (params?: { section_id?: string }) => {
        const query = params?.section_id ? `?section=${params.section_id}` : '';
        return apiRequest<Student[]>(`/academic/students/${query}`);
    },
    getStudent: (id: string) => apiRequest<Student>(`/academic/students/${id}/`),
    getMyStudent: () => apiRequest<Student>('/academic/students/me/'),
    createStudent: (data: Partial<Student>) => apiRequest<Student>('/academic/students/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    importStudents: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiRequest<{
            success: boolean;
            results: { created: number; failed: number; errors: any[] }
        }>('/academic/students/import_data/', {
            method: 'POST',
            body: formData,
        });
    },
    updateStudent: (id: string, data: Partial<Student>) => apiRequest<Student>(`/academic/students/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteStudent: (id: string) => apiRequest<void>(`/academic/students/${id}/`, {
        method: 'DELETE'
    }),

    // Chapters
    getChapters: (subjectId?: number) => {
        const query = subjectId ? `?subject=${subjectId}` : '';
        return apiRequest<Chapter[]>(`/academic/chapters/${query}`);
    },
    getChapter: (id: number) => apiRequest<Chapter>(`/academic/chapters/${id}/`),
    createChapter: (data: Partial<Chapter>) => apiRequest<Chapter>('/academic/chapters/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateChapter: (id: number, data: Partial<Chapter>) => apiRequest<Chapter>(`/academic/chapters/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteChapter: (id: number) => apiRequest<void>(`/academic/chapters/${id}/`, {
        method: 'DELETE'
    }),
    reorderChapters: (orders: { id: number; order: number }[]) => apiRequest<{ status: string }>('/academic/chapters/reorder/', {
        method: 'POST',
        body: JSON.stringify({ orders })
    }),

    // Lessons
    getLessons: (chapterId?: number, subjectId?: number) => {
        const params = new URLSearchParams();
        if (chapterId) params.append('chapter', chapterId.toString());
        if (subjectId) params.append('subject', subjectId.toString());
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<Lesson[]>(`/academic/lessons/${query}`);
    },
    getLesson: (id: number) => apiRequest<Lesson>(`/academic/lessons/${id}/`),
    createLesson: (data: Partial<Lesson>) => apiRequest<Lesson>('/academic/lessons/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateLesson: (id: number, data: Partial<Lesson>) => apiRequest<Lesson>(`/academic/lessons/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteLesson: (id: number) => apiRequest<void>(`/academic/lessons/${id}/`, {
        method: 'DELETE'
    }),
    reorderLessons: (orders: { id: number; order: number }[]) => apiRequest<{ status: string }>('/academic/lessons/reorder/', {
        method: 'POST',
        body: JSON.stringify({ orders })
    }),
    toggleLessonProgress: (id: number) => apiRequest<{ completed: boolean }>(`/academic/lessons/${id}/toggle_progress/`, {
        method: 'POST'
    }),

    // Lesson Materials
    getMaterials: (lessonId?: number) => {
        const query = lessonId ? `?lesson=${lessonId}` : '';
        return apiRequest<LessonMaterial[]>(`/academic/materials/${query}`);
    },
    createMaterial: (data: FormData) => apiRequest<LessonMaterial>('/academic/materials/', {
        method: 'POST',
        body: data // Use FormData for file uploads
    }),
    deleteMaterial: (id: number) => apiRequest<void>(`/academic/materials/${id}/`, {
        method: 'DELETE'
    }),

    // Assessments

    getGradebook: (subjectId: number) => {
        return apiRequest<GradebookData>(`/academic/assessments/gradebook/?subject=${subjectId}`);
    },


    // Results
    getResults: (studentId?: string) => {
        const query = studentId ? `?student_id=${studentId}` : '';
        return apiRequest<Result[]>(`/academic/results/${query}`);
    },
    getResult: (id: string) => apiRequest<Result>(`/academic/results/${id}/`),
    createResult: (data: Partial<Result>) => apiRequest<Result>('/academic/results/', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    updateResult: (id: string, data: Partial<Result>) => apiRequest<Result>(`/academic/results/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    generateAIFeedback: (id: string) => apiRequest<{ ai_feedback: string }>(`/academic/results/${id}/generate_ai_feedback/`, {
        method: 'POST'
    }),

    // Submissions
    getSubmissions: (assessmentId?: string) => {
        const query = assessmentId ? `?assessment=${assessmentId}` : '';
        return apiRequest<Submission[]>(`/academic/submissions/${query}`);
    },
    getSubmission: (id: string) => apiRequest<Submission>(`/academic/submissions/${id}/`),
    createSubmission: (data: Partial<Submission>) => apiRequest<Submission>('/academic/submissions/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateSubmission: (id: string, data: Partial<Submission>) => apiRequest<Submission>(`/academic/submissions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    gradeSubmission: (id: string, data: Record<string, unknown>) =>
        apiRequest<GradeResult>(`/academic/submissions/${id}/grade/`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    triggerAIGrading: (id: string) =>
        apiRequest<any>(`/academic/submissions/${id}/ai_grade/`, {
            method: 'POST'
        }),
    submitExam: (assessmentId: string, answers: any, timeTaken: number) => apiRequest<{ score: number; max_score: number; result_id: string }>('/academic/submissions/submit_exam/', {
        method: 'POST',
        body: JSON.stringify({ assessment: assessmentId, answers, time_taken: timeTaken })
    }),

    // Questions
    getQuestions: () => apiRequest<Question[]>('/academic/questions/'),
    getQuestionsByAssessment: (assessmentId: string) => {
        return apiRequest<Question[]>(`/academic/questions/?assessment=${assessmentId}`);
    },
    createQuestion: (data: Partial<Question>) => apiRequest<Question>('/academic/questions/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateQuestion: (id: string, data: Partial<Question>) => apiRequest<Question>(`/academic/questions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteQuestion: (id: string) => apiRequest<void>(`/academic/questions/${id}/`, {
        method: 'DELETE'
    }),
    reorderQuestions: (orders: { id: string; order: number }[]) => apiRequest<{ status: string }>('/academic/questions/reorder/', {
        method: 'POST',
        body: JSON.stringify({ orders })
    }),

    // Parent Profiles
    getMyParent: () => apiRequest<Parent>('/academic/parents/me/'),

    // Notices
    getNotices: () => apiRequest<Notice[]>('/academic/notices/'),
    getNotice: (id: number) => apiRequest<Notice>(`/academic/notices/${id}/`),
    createNotice: (data: Partial<Notice>) => apiRequest<Notice>('/academic/notices/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateNotice: (id: number, data: Partial<Notice>) => apiRequest<Notice>(`/academic/notices/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteNotice: (id: number, data?: Partial<Notice>) => apiRequest<void>(`/academic/notices/${id}/`, {
        method: 'DELETE'
    }),

    // Exams
    getExams: () => apiRequest<Exam[]>('/academic/exams/'),
    getExam: (id: string) => apiRequest<Exam>(`/academic/exams/${id}/`),
    createExam: (data: Partial<Exam>) => apiRequest<Exam>('/academic/exams/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateExam: (id: string, data: Partial<Exam>) => apiRequest<Exam>(`/academic/exams/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteExam: (id: string) => apiRequest<void>(`/academic/exams/${id}/`, {
        method: 'DELETE'
    }),
    generateHallTickets: (id: string) => apiRequest<{ message: string }>(`/academic/exams/${id}/generate_hall_tickets/`, {
        method: 'POST'
    }),
    getExamSeating: (studentId?: string) => {
        const query = studentId ? `?student=${studentId}` : '';
        return apiRequest<ExamSeating[]>(`/academic/exam-seating/${query}`);
    },
};

// Billing API
export const billingAPI = {
    getSubscriptions: () => apiRequest<Subscription[]>('/billing/subscriptions/'),
    getSubscription: (id: string) => apiRequest<Subscription>(`/billing/subscriptions/${id}/`),

    // Finance Management
    getFeeStructures: () => apiRequest<FeeStructure[]>('/billing/fee-structures/'),
    createFeeStructure: (data: Partial<FeeStructure>) => apiRequest<FeeStructure>('/billing/fee-structures/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateFeeStructure: (id: string, data: Partial<FeeStructure>) => apiRequest<FeeStructure>(`/billing/fee-structures/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteFeeStructure: (id: string) => apiRequest<void>(`/billing/fee-structures/${id}/`, {
        method: 'DELETE'
    }),

    getStudentFees: () => apiRequest<StudentFee[]>('/billing/student-fees/'),
    assignBulkFees: (data: { fee_structure_id: string; academic_class_id: string; due_date: string }) =>
        apiRequest<{ message: string }>('/billing/student-fees/assign_bulk/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    getPayments: () => apiRequest<Payment[]>('/billing/payments/'),
    recordPayment: (data: Partial<Payment>) => apiRequest<Payment>('/billing/payments/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    getExpenses: () => apiRequest<Expense[]>('/billing/expenses/'),
    createExpense: (data: Partial<Expense>) => apiRequest<Expense>('/billing/expenses/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateExpense: (id: string, data: Partial<Expense>) => apiRequest<Expense>(`/billing/expenses/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteExpense: (id: string) => apiRequest<void>(`/billing/expenses/${id}/`, {
        method: 'DELETE'
    }),

    getFinanceDashboard: () => apiRequest<FinanceDashboard>('/billing/dashboard/'),

    downloadReceipt: (paymentId: string) => apiRequestBlob(`/billing/payments/${paymentId}/generate_receipt/`),
};


// Library API
export const libraryAPI = {
    // Books
    getBooks: () => apiRequest<Book[]>('/library/books/'),
    getBook: (id: string) => apiRequest<Book>(`/library/books/${id}/`),
    createBook: (data: Partial<Book>) => apiRequest<Book>('/library/books/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateBook: (id: string, data: Partial<Book>) => apiRequest<Book>(`/library/books/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    }),
    deleteBook: (id: string) => apiRequest<void>(`/library/books/${id}/`, {
        method: 'DELETE'
    }),

    // Book Issues
    getBookIssues: () => apiRequest<BookIssue[]>('/library/issues/'),
    getBookIssue: (id: string) => apiRequest<BookIssue>(`/library/issues/${id}/`),
    issueBook: (data: { book: string; student: string }) => apiRequest<BookIssue>('/library/issues/', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    returnBook: (id: string) => apiRequest<BookIssue>(`/library/issues/${id}/return_book/`, {
        method: 'POST'
    }),
};

// AI Engine API
export const aiAPI = {
    chat: (message: string, studentId: string, conversationHistory: ChatMessage[]) =>
        apiRequest<{ response: string; tokens_used: number; is_demo: boolean }>('/ai/tutor/chat/', {
            method: 'POST',
            body: JSON.stringify({
                message,
                student_id: studentId,
                conversation_history: conversationHistory
            })
        }),
    getAILogs: () => apiRequest<any[]>('/ai/logs/'),
    getRecommendations: () => apiRequest<{
        recommendations: Array<{
            id: number;
            title: string;
            subject: string;
            subject_id: number;
            reason: string;
        }>;
        learning_style_advice: string;
    }>('/ai/personalization/recommendations/'),
    getTeacherAnalytics: () => apiRequest<{
        at_risk_count: number;
        at_risk_students: Array<{
            id: string;
            name: string;
            risk_level: string;
            reasons: string[];
            score: number;
        }>;
        performance_trends: Array<{
            week: string;
            avgScore: number;
            classAvg: number;
        }>;
        topic_mastery: Array<{
            topic: string;
            score: number;
        }>;
        ai_insights: string[];
    }>('/ai/analytics/teacher/'),
    getStudentReport: (studentId: string) => apiRequest<any>(`/ai/reports/student/${studentId}/`),
    getActivePath: () => apiRequest<LearningPath>('/ai/learning-paths/active/'),
};

// Notifications API
export const notificationsAPI = {
    getNotifications: () => apiRequest<Notification[]>('/notifications/notifications/'),
    getUnreadCount: () => apiRequest<{ count: number }>('/notifications/notifications/unread_count/'),
    markAsRead: (id: number) => apiRequest<{ status: string }>(`/notifications/notifications/${id}/mark_as_read/`, {
        method: 'POST'
    }),
    markAllAsRead: () => apiRequest<{ status: string }>('/notifications/notifications/mark_all_as_read/', {
        method: 'POST'
    }),
};

// Conversations API
export const conversationsAPI = {
    getConversations: () => apiRequest<Conversation[]>('/conversations/conversations/'),
    getConversation: (id: string) => apiRequest<Conversation>(`/conversations/conversations/${id}/`),
    markAsRead: (id: string) => apiRequest<{ status: string }>(`/conversations/conversations/${id}/mark_as_read/`, {
        method: 'POST'
    }),
    startDirectMessage: (userId: string) => apiRequest<Conversation>('/conversations/conversations/start_direct_message/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    }),
    getMessages: (conversationId: string) => apiRequest<Message[]>(`/conversations/messages/?conversation=${conversationId}`),
    sendMessage: (conversationId: string, content: string) => apiRequest<Message>('/conversations/messages/', {
        method: 'POST',
        body: JSON.stringify({ conversation: conversationId, content })
    }),
    createGroup: (title: string, participantIds: string[]) => apiRequest<Conversation>('/conversations/conversations/create_group/', {
        method: 'POST',
        body: JSON.stringify({ title, participant_ids: participantIds })
    }),
    addParticipants: (id: string, participantIds: string[]) => apiRequest<{ status: string }>(`/conversations/conversations/${id}/add_participants/`, {
        method: 'POST',
        body: JSON.stringify({ participant_ids: participantIds })
    }),
    removeParticipant: (id: string, userId: string) => apiRequest<{ status: string }>(`/conversations/conversations/${id}/remove_participant/`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    }),
};

// Helper functions for common operations
// Helper functions for common operations
export const helpers = {
    // Get subjects for a student's class
    getStudentSubjects: async (studentId?: string): Promise<Subject[]> => {
        try {
            let student;

            // If no studentId provided, fetch the current user's student profile
            if (!studentId) {
                student = await academicAPI.getMyStudent();
            } else {
                student = await academicAPI.getStudent(studentId);
            }

            if (!student.academic_class) return [];

            const subjects = await academicAPI.getSubjects();
            // Filter subjects by class match
            return subjects.filter((subject) => subject.academic_class === student.academic_class);
        } catch (e) {
            console.error("Error fetching student subjects", e);
            return [];
        }
    },

    getTeacherSubjects: async (teacherId: string): Promise<Subject[]> => {
        try {
            // Fetch all subjects and filter? Ideally backend endpoint S3-4
            const subjects = await academicAPI.getSubjects();
            // Frontend filter logic (Subject.teacher is string UUID)
            return subjects.filter(s => s.teacher === teacherId);
        } catch (e) {
            console.error("Error fetching teacher subjects", e);
            return [];
        }
    },

    getLessonsBySubject: async (subjectId: string | number): Promise<Lesson[]> => {
        try {
            return await academicAPI.getLessons(undefined, typeof subjectId === 'string' ? parseInt(subjectId) : subjectId);
        } catch (e) {
            console.error("Error fetching lessons", e);
            return [];
        }
    },

    getStudentResultsWithDetails: async (studentId: string) => {
        try {
            const [results, assessments, subjects] = await Promise.all([
                academicAPI.getResults(studentId),
                academicAPI.getAssessments(),
                academicAPI.getSubjects()
            ]);

            return results.map(result => {
                const assessment = assessments.find(a => a.assessment_id === result.assessment);
                const subject = assessment
                    ? subjects.find(s => s.id.toString() === assessment.subject?.toString())
                    : undefined;

                return {
                    ...result,
                    assessmentDetails: assessment,
                    subjectDetails: subject,
                    courseDetails: subject ? { ...subject, subject: subject.name, course_id: subject.id.toString() } : undefined
                };
            });
        } catch (e) {
            console.error("Error fetching results with details", e);
            return [];
        }
    },

    downloadFile: async (url: string, filename: string) => {
        const token = getAuthToken();
        const downloadTenantId = (typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null) || 'demo';
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': downloadTenantId
            }
        });
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
};

export const saasApi = {
    getTenants: () => coreAPI.getTenants(),
    getTenant: (id: string) => coreAPI.getTenant(id),
    createTenant: (data: Partial<Tenant>) => coreAPI.createTenant(data),
    updateTenant: (id: string, data: Partial<Tenant>) => coreAPI.updateTenant(id, data),
    getInvoices: () => apiRequest<Invoice[]>('/billing/invoices/'),
    getPlans: () => apiRequest<SubscriptionPlan[]>('/billing/plans/'),
    getPlan: (id: string) => apiRequest<SubscriptionPlan>(`/billing/plans/${id}/`),
    createPlan: (data: Partial<SubscriptionPlan>) =>
        apiRequest<SubscriptionPlan>('/billing/plans/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updatePlan: (id: string, data: Partial<SubscriptionPlan>) =>
        apiRequest<SubscriptionPlan>(`/billing/plans/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
    deletePlan: (id: string) => apiRequest<void>(`/billing/plans/${id}/`, { method: 'DELETE' }),
    getSettings: () => apiRequest<GlobalSettings>('/core/settings/'),
    updateSettings: (data: Partial<GlobalSettings>) =>
        apiRequest<GlobalSettings>('/core/settings/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getAuditLogs: () => coreAPI.getAuditLogs(),
    getSystemStatus: () => coreAPI.getSystemStatus(),
    getKPIs: () => apiRequest<{ kpis: any, revenue_trend: any[], tenant_activity: any[] }>('/core/saas-kpi/'),
    getAIUsage: () => apiRequest<{ total_tokens: number, cost_estimate: number, usage_by_feature: any[] }>('/core/saas-ai-usage/'),
    helpers: helpers,
};

export const api = {
    core: coreAPI,
    users: usersAPI,
    academic: academicAPI,
    billing: billingAPI,
    library: libraryAPI,
    ai: {
        getTeacherAnalytics: () => apiRequest<any>('/ai/analytics/teacher/'),
        tutorChat: (data: { message: string; history: any[] }) =>
            apiRequest<any>('/ai/tutor/chat/', {
                method: 'POST',
                body: JSON.stringify(data)
            }),
        getStudySchedule: () => apiRequest<any[]>('/ai/study-schedule/'),
        generateStudySchedule: () => apiRequest<any[]>('/ai/study-schedule/generate/', { method: 'POST' }),
        updateStudyEvent: (id: string, updates: any) =>
            apiRequest<any>(`/ai/study-schedule/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            }),
        generateStudentReport: (studentId: string) =>
            apiRequest<any>(`/ai/reports/student/${studentId}/`, {
                method: 'POST'
            }),
    },
    notifications: notificationsAPI,
    conversations: conversationsAPI,
    learningPaths: {
        getPaths: () => apiRequest<LearningPath[]>('/ai/learning-paths/'),
        generatePath: (data: { student_id: string; subject_id?: number; topic_focus?: string }) =>
            apiRequest<LearningPath>('/ai/learning-paths/generate/', {
                method: 'POST',
                body: JSON.stringify(data)
            }),
        updateNodeStatus: (nodeId: string, status: string) =>
            apiRequest<{ status: string; next_node_unlocked: boolean }>(`/ai/learning-nodes/${nodeId}/complete/`, {
                method: 'POST'
            }),
    },
    reports: {
        getStudentPerformancePDF: (studentId: string) => `${API_BASE_URL}/academic/reports/student-performance/${studentId}/`,
        getStudentPerformanceExcel: (studentId: string) => `${API_BASE_URL}/academic/reports/student-performance-excel/${studentId}/`,
        getAttendanceSummaryPDF: (sectionId: string | number) => `${API_BASE_URL}/academic/reports/attendance-summary/${sectionId}/`,
        getAttendanceSummaryExcel: (sectionId: string | number) => `${API_BASE_URL}/academic/reports/attendance-summary-excel/${sectionId}/`,
        getFeeCollectionPDF: (start?: string, end?: string) => {
            const query = new URLSearchParams();
            if (start) query.append('start_date', start);
            if (end) query.append('end_date', end);
            return `${API_BASE_URL}/billing/reports/fee-collection/?${query.toString()}`;
        },
        getFeeCollectionExcel: (start?: string, end?: string) => {
            const query = new URLSearchParams();
            if (start) query.append('start_date', start);
            if (end) query.append('end_date', end);
            return `${API_BASE_URL}/billing/reports/fee-collection-excel/?${query.toString()}`;
        },
        getPendingFeesPDF: () => `${API_BASE_URL}/billing/reports/pending-fees/`,
        getPendingFeesExcel: () => `${API_BASE_URL}/billing/reports/pending-fees-excel/`,
        getResultCardPDF: (studentId: string, resultId: string) => `${API_BASE_URL}/academic/reports/result-card/${studentId}/${resultId}/`,
        getHallTicketPDF: (seatingId: string) => `${API_BASE_URL}/academic/reports/hall-ticket/${seatingId}/`,
        getBulkHallTicketsZIP: (examId: string) => `${API_BASE_URL}/academic/reports/bulk-hall-tickets/${examId}/`,
    },
    settings: {
        get: () => apiRequest('/core/settings/'),
        update: (data: any) => apiRequest('/core/settings/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }),
    },
    backups: {
        list: () => apiRequest('/core/backups/'),
        create: (data?: any) => apiRequest('/core/backups/', {
            method: 'POST',
            body: JSON.stringify(data || {})
        }),
    },
    auditLogs: {
        list: () => apiRequest('/core/audit-logs/'),
    },
    gamification: {
        getBadges: () => apiRequest<Badge[]>('/gamification/available-badges/'),
        getMyBadges: () => apiRequest<StudentBadge[]>('/gamification/student-badges/'),
        getStudentBadges: () => apiRequest<StudentBadge[]>('/gamification/student-badges/'),
        getLeaderboard: (scope: 'class' | 'school' = 'class') => apiRequest<any[]>(`/gamification/leaderboard/?scope=${scope}`),
        getMyStats: () => apiRequest<any>('/gamification/profile/my_stats/'),
        updateProfile: (id: string, data: any) => apiRequest<any>(`/gamification/profile/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
    },
    helpers: helpers,
};

export const learningPathsAPI = api.learningPaths;
export const gamificationAPI = api.gamification;
export const reportsAPI = api.reports;

export default api;
