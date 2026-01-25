'use client';

/* eslint-disable @next/next/no-img-element */

import { TeacherSidebar } from '@/components/teacher-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersAPI, User as UserType } from '@/lib/api';
import { NotificationBell } from '@/components/notification-bell';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<(UserType & { profile_image?: string }) | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        usersAPI.getMe().then(setUser).catch(console.error);
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64">
                <TeacherSidebar />
            </aside>

            {/* Sidebar (Mobile Overlay) */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <div className="relative bg-white w-64 h-full shadow-xl">
                        <TeacherSidebar />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-5 w-5 text-slate-500" />
                        </Button>
                        <div className="relative w-full max-w-md hidden md:block" suppressHydrationWarning>
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search classes, students, assignments..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-full"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageSelector />
                        <NotificationBell />

                        <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-slate-900">{user?.first_name || 'Teacher'} {user?.last_name || ''}</p>
                                <p className="text-xs text-slate-500 capitalize">{user?.role || 'Educator'}</p>
                            </div>
                            <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                                {user?.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-5 w-5 text-indigo-600" />
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8 space-y-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
