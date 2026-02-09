'use client';

import { AdminSidebar } from '@/components/admin-sidebar';
import { Input } from '@/components/ui/input';
import { Search, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersAPI, User as UserType } from '@/lib/api';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<UserType | null>(null);

    useEffect(() => {
        usersAPI.getMe().then(setUser).catch(console.error);
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 hidden lg:block">
                <AdminSidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-40 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md hidden md:block">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search students, teachers, reports..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <NotificationCenter />

                        <div className="flex items-center gap-3 pl-4 border-l">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-slate-900">{user?.first_name || 'Admin'} {user?.last_name || ''}</p>
                                <p className="text-xs text-slate-500 capitalize">{user?.role || 'School Administrator'}</p>
                            </div>
                            <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                <User className="h-5 w-5 text-indigo-600" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
