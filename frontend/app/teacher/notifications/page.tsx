'use client';

import { NotificationList } from '@/components/notifications/NotificationList';

export default function TeacherNotificationsPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Staff Notifications</h1>
            <NotificationList />
        </div>
    );
}
