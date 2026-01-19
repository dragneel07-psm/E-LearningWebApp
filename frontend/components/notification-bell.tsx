'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { notificationsAPI, Notification } from '@/lib/api';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();

    // Determine the role from the current path
    const role = pathname.split('/')[1] || 'admin';

    useEffect(() => {
        loadNotifications();

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadNotifications() {
        try {
            const [notifs, countData] = await Promise.all([
                notificationsAPI.getNotifications(),
                notificationsAPI.getUnreadCount()
            ]);

            // Get recent 5 notifications
            setNotifications(notifs.slice(0, 5));
            setUnreadCount(countData.count);
        } catch (error) {
            // Silently fail - notifications are not critical
            // Set empty state to prevent UI errors
            setNotifications([]);
            setUnreadCount(0);
        }
    }

    async function handleMarkAsRead(id: number) {
        try {
            await notificationsAPI.markAsRead(id);
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    }

    async function handleMarkAllAsRead() {
        setLoading(true);
        try {
            await notificationsAPI.markAllAsRead();
            loadNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setLoading(false);
        }
    }

    function formatTimeAgo(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-600 text-white text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700"
                            onClick={handleMarkAllAsRead}
                            disabled={loading}
                        >
                            {loading ? 'Marking...' : 'Mark all as read'}
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                        No notifications
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                className={`flex flex-col items-start p-3 cursor-pointer ${!notif.is_read ? 'bg-indigo-50/50' : ''
                                    }`}
                                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                                <div className="flex justify-between items-start w-full mb-1">
                                    <span className="font-medium text-sm">{notif.title}</span>
                                    {!notif.is_read && (
                                        <div className="h-2 w-2 bg-indigo-600 rounded-full mt-1 ml-2 flex-shrink-0" />
                                    )}
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                                    {notif.message}
                                </p>
                                <span className="text-xs text-slate-400">
                                    {formatTimeAgo(notif.created_at)}
                                </span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href={`/${role}/notifications`}
                        className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                    >
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
