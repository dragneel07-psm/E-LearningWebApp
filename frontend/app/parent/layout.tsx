'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import {
    LayoutDashboard, Users, CalendarDays, GraduationCap,
    Wallet, CalendarClock, BookOpen, MessageSquare, LogOut
} from 'lucide-react';
import { removeTokens } from '@/lib/auth';

const NAV = [
    { href: '/parent', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/parent/children', label: 'My Children', icon: Users },
    { href: '/parent/attendance', label: 'Attendance', icon: CalendarDays },
    { href: '/parent/grades', label: 'Grades', icon: GraduationCap },
    { href: '/parent/fees', label: 'Fees', icon: Wallet },
    { href: '/parent/leaves', label: 'Leave Requests', icon: CalendarClock },
    { href: '/parent/meetings', label: 'Meetings', icon: CalendarClock },
    { href: '/parent/notices', label: 'Notices', icon: BookOpen },
    { href: '/parent/messages', label: 'Messages', icon: MessageSquare },
];

export default function ParentLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        removeTokens();
        router.push('/login');
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-100 fixed top-0 left-0 h-full z-30 pt-6">
                <div className="px-5 mb-6">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-900 leading-tight">Parent Portal</p>
                            <p className="text-[10px] text-slate-400">Family Dashboard</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-0.5">
                    {NAV.map(({ href, label, icon: Icon, exact }) => {
                        const active = exact ? pathname === href : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    active
                                        ? 'bg-violet-50 text-violet-700'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                            >
                                <Icon className={`h-4 w-4 ${active ? 'text-violet-600' : 'text-slate-400'}`} />
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-violet-600 flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-black text-slate-900 text-sm">Parent Portal</span>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {NAV.slice(0, 5).map(({ href, icon: Icon, exact }) => {
                        const active = exact ? pathname === href : pathname.startsWith(href);
                        return (
                            <Link key={href} href={href} className={`p-2 rounded-lg ${active ? 'bg-violet-50 text-violet-600' : 'text-slate-400'}`}>
                                <Icon className="h-4 w-4" />
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Main content */}
            <main className="flex-1 md:ml-60 pt-16 md:pt-0 min-h-screen">
                {children}
            </main>
        </div>
    );
}
