'use client';

import { NotificationList } from '@/components/notifications/NotificationList';

export default function StudentNotificationsPage() {
    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Notifications History</h1>
            <NotificationList />
        </div>
    );
}
