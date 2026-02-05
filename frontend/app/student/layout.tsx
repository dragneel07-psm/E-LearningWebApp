'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, BookOpen, FileText, Calendar,
    User as UserIcon, LogOut, Menu, X, MessageSquare,
    GraduationCap, Clock, FileBarChart, CreditCard,
    BrainCircuit, Trophy, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { removeTokens } from '@/lib/auth';
import { usersAPI, User } from '@/lib/api';
import { NotificationBell } from '@/components/notification-bell';
import { LanguageSelector } from '@/components/LanguageSelector';
import { GamificationProvider } from '@/components/providers/gamification-provider';
import { HeaderStats } from '@/components/gamification/header-stats';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    const loadUser = useCallback(async () => {
        try {
            const me = await usersAPI.getMe();
            setUser(me);
        } catch (error) {
            console.error('Failed to load user', error);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const navItems = [
        { label: 'Dashboard', href: '/student', icon: LayoutDashboard },
        { label: 'Learning Path', href: '/student/learning-path', icon: BrainCircuit },
        { label: 'My Classes', href: '/student/classes', icon: BookOpen },
        { label: 'Assignments', href: '/student/assignments', icon: FileText },
        { label: 'Library', href: '/student/library', icon: BookOpen },
        { label: 'Attendance', href: '/student/attendance', icon: Calendar },
        { label: 'Assessments', href: '/student/assessments', icon: GraduationCap },
        { label: 'My Grades', href: '/student/grades', icon: Award },
        { label: 'Fees & Payments', href: '/student/fees', icon: CreditCard },
        { label: 'Timetable', href: '/student/timetable', icon: Clock },
        { label: 'Leaderboard', href: '/student/leaderboard', icon: Trophy },
        { label: 'Notices', href: '/student/notices', icon: FileBarChart }, // Using FileBarChart as closest generic for notices/reports
        { label: 'Messages', href: '/student/messages', icon: MessageSquare },
        { label: 'Profile', href: '/student/profile', icon: UserIcon },
    ];

    const handleLogout = () => {
        removeTokens();
        router.push('/login');
    };

    return (
        <GamificationProvider>
            <div className="min-h-screen bg-slate-50 flex">
                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 
                    transform transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="h-full flex flex-col">
                        {/* Logo Area */}
                        <div className="h-16 flex items-center px-6 border-b border-slate-100">
                            <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
                                <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                                    <GraduationCap className="h-5 w-5" />
                                </span>
                                <span>Student<span className="text-slate-900">Portal</span></span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto lg:hidden"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <div className={`
                                            flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                                            ${isActive
                                                ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }
                                        `}>
                                            <item.icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            {item.label}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Profile Summary */}
                        <div className="p-4 border-t border-slate-100">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                                    <AvatarFallback className="bg-indigo-100 text-indigo-700">
                                        {user?.first_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {user?.first_name || 'Student'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        Class 10-A
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Mobile Header */}
                    <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                            <Menu className="h-6 w-6 text-slate-600" />
                        </Button>
                        <span className="font-bold text-slate-900">Student Portal</span>
                        <div className="w-10" /> {/* Spacer for centering */}
                    </header>

                    <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                        <div className="max-w-6xl mx-auto">
                            {/* Header Section (Greeting & Actions) */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">
                                        Good Morning, {user?.first_name || 'Student'}! 👋
                                    </h1>
                                    <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening in your classes today.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <HeaderStats />
                                    <LanguageSelector />
                                    <NotificationBell />
                                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-md shadow-indigo-200">
                                        Join Online Class
                                    </Button>
                                </div>
                            </div>

                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </GamificationProvider>
    );
}
