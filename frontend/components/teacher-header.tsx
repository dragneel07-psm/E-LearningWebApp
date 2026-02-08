'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, Globe } from 'lucide-react';
import { User } from '@/lib/api';
import { NotificationBell } from './notification-bell';

export function TeacherHeader() {
    const user: User = {
        first_name: 'Sarah',
        last_name: 'Wilson',
        email: 'sarah.w@school.edu',
        role: 'teacher',
        user_id: 't1',
        username: 'teacher1',
        tenant: 'tenant1'
    };

    return (
        <header className="sticky top-0 z-30 bg-white border-b h-16 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-8">
                <Link href="/teacher" className="font-bold text-xl text-indigo-700 hidden md:block">Teacher Portal</Link>
                <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100/50 backdrop-blur-sm rounded-full border border-slate-200/60 max-w-fit">
                    {[
                        { name: 'Dashboard', href: '/teacher', exact: true },
                        { name: 'Classes', href: '/teacher/classes' },
                        { name: 'Analytics', href: '/teacher/analytics' },
                    ].map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-white hover:shadow-sm transition-all duration-200"
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-6">
                {/* Academic Year Selector (Mock) */}
                <div className="hidden md:flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-md border">
                    <span className="text-muted-foreground">Year:</span>
                    <span className="font-medium">2025-2026</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded-md border">
                    <span className="text-muted-foreground">Term:</span>
                    <span className="font-medium">Fall</span>
                </div>

                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <Button variant="ghost" size="sm" className="hidden md:flex gap-1 text-slate-600">
                        <Globe className="h-4 w-4" /> EN
                    </Button>
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm cursor-pointer">
                        <span className="font-bold text-indigo-700">{user?.first_name?.[0]}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
