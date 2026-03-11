/**
 * Role-Based Access Control for the Admin Panel.
 *
 * Roles:
 *  - admin        → School Principal / Main Admin (full access)
 *  - accountant   → Finance, fee collection, inventory, reports
 *  - librarian    → Library, inventory, calendar
 *  - receptionist → Admissions, front-desk, communication, SIS
 *  - hr_manager   → HR & Payroll, teachers, communication, reports
 *  - hostel_warden → Hostel, students (view), calendar
 *  - transport_manager → Transport, students (view), calendar
 */

import { StaffRole } from './auth';

/** Every route segment in the admin sidebar */
export type AdminModule =
    | '/admin'
    | '/admin/erp'
    | '/admin/admissions'
    | '/admin/academic/years'
    | '/admin/academic/classes'
    | '/admin/timetable'
    | '/admin/academic/subjects'
    | '/admin/academic/assessments'
    | '/admin/academic/promotion-exceptions'
    | '/admin/exams'
    | '/admin/academic/students'
    | '/admin/academic/teachers'
    | '/admin/library'
    | '/admin/finance'
    | '/admin/finance/fees'
    | '/admin/finance/collect'
    | '/admin/finance/reports'
    | '/admin/calendar'
    | '/admin/hr'
    | '/admin/sis'
    | '/admin/hostel'
    | '/admin/transport'
    | '/admin/inventory'
    | '/admin/analytics'
    | '/admin/ai-analytics'
    | '/admin/reports'
    | '/admin/communication'
    | '/admin/messages'
    | '/admin/communication/templates'
    | '/admin/notices'
    | '/admin/settings'
    | '/admin/notifications';

/** Modules every logged-in admin-panel user always sees */
const COMMON: AdminModule[] = ['/admin', '/admin/calendar', '/admin/notifications'];

/** Full access for the School Admin / Principal */
const ADMIN_FULL: AdminModule[] = [
    '/admin',
    '/admin/erp',
    '/admin/admissions',
    '/admin/academic/years',
    '/admin/academic/classes',
    '/admin/timetable',
    '/admin/academic/subjects',
    '/admin/academic/assessments',
    '/admin/academic/promotion-exceptions',
    '/admin/exams',
    '/admin/academic/students',
    '/admin/academic/teachers',
    '/admin/library',
    '/admin/finance',
    '/admin/finance/fees',
    '/admin/finance/collect',
    '/admin/finance/reports',
    '/admin/calendar',
    '/admin/hr',
    '/admin/sis',
    '/admin/hostel',
    '/admin/transport',
    '/admin/inventory',
    '/admin/analytics',
    '/admin/ai-analytics',
    '/admin/reports',
    '/admin/communication',
    '/admin/messages',
    '/admin/communication/templates',
    '/admin/notices',
    '/admin/settings',
    '/admin/notifications',
];

const STAFF_ROLE_MODULES: Record<StaffRole, AdminModule[]> = {
    '': COMMON,

    accountant: [
        ...COMMON,
        '/admin/erp',
        '/admin/finance',
        '/admin/finance/fees',
        '/admin/finance/collect',
        '/admin/finance/reports',
        '/admin/inventory',
        '/admin/reports',
    ],

    librarian: [
        ...COMMON,
        '/admin/library',
        '/admin/inventory',
    ],

    receptionist: [
        ...COMMON,
        '/admin/admissions',
        '/admin/academic/classes',
        '/admin/timetable',
        '/admin/academic/students',
        '/admin/sis',
        '/admin/communication',
        '/admin/messages',
        '/admin/communication/templates',
        '/admin/notices',
    ],

    hr_manager: [
        ...COMMON,
        '/admin/erp',
        '/admin/academic/teachers',
        '/admin/hr',
        '/admin/reports',
        '/admin/communication',
        '/admin/messages',
    ],

    hostel_warden: [
        ...COMMON,
        '/admin/hostel',
        '/admin/academic/students',
    ],

    transport_manager: [
        ...COMMON,
        '/admin/transport',
        '/admin/academic/students',
    ],
};

/**
 * Returns the set of admin modules accessible to a given role/staff_role combo.
 */
export function getAllowedModules(role: string, staffRole: StaffRole): Set<AdminModule> {
    if (role === 'admin') return new Set(ADMIN_FULL);
    if (role === 'staff') {
        const modules = STAFF_ROLE_MODULES[staffRole] ?? COMMON;
        return new Set(modules);
    }
    return new Set(COMMON);
}

/**
 * Returns true if the user may access the given module path.
 * Uses prefix matching so child routes are also allowed when the parent is.
 */
export function canAccess(
    role: string,
    staffRole: StaffRole,
    modulePath: AdminModule,
): boolean {
    return getAllowedModules(role, staffRole).has(modulePath);
}

/** Human-readable label for the staff_role */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
    '': 'Staff',
    accountant: 'Accountant',
    librarian: 'Librarian',
    receptionist: 'Receptionist',
    hr_manager: 'HR Manager',
    hostel_warden: 'Hostel Warden',
    transport_manager: 'Transport Manager',
};

export function getRoleLabel(role: string, staffRole: StaffRole): string {
    if (role === 'admin') return 'School Admin';
    if (role === 'staff') return STAFF_ROLE_LABELS[staffRole] ?? 'Staff';
    return role.charAt(0).toUpperCase() + role.slice(1);
}
