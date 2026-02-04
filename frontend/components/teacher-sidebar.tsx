'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    ClipboardList,
    FileText,
    Calendar,
    MessageSquare,
    User,
    LogOut,
    GraduationCap,
    School,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
    { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
    { name: 'Courses', href: '/teacher/courses', icon: BookOpen },
    { name: 'My Classes', href: '/teacher/classes', icon: School },
    { name: 'Students', href: '/teacher/students', icon: Users }, // Enhance later
    { name: 'Assessments', href: '/teacher/assessments', icon: ClipboardList },
    { name: 'Grading', href: '/teacher/grading', icon: FileText },
    { name: 'Timetable', href: '/teacher/timetable', icon: Calendar },
    { name: 'Library', href: '/teacher/library', icon: BookOpen },
    { name: 'Notices', href: '/teacher/notices', icon: Bell },
    { name: 'Messages', href: '/teacher/messages', icon: MessageSquare },
    { name: 'Profile', href: '/teacher/profile', icon: User },
];

export function TeacherSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex bg-white border-r border-slate-200 text-slate-600 w-64 min-h-screen flex-col shadow-sm">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900">Teacher Portal</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 gap-3"
                    onClick={() => window.location.href = '/login'}
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
