'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, GraduationCap, School, CreditCard, BarChart3, Settings, LogOut, Bell, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Students', href: '/admin/academic/students', icon: GraduationCap },
    { name: 'Teachers', href: '/admin/academic/teachers', icon: Users },
    { name: 'Classes', href: '/admin/academic/classes', icon: School },
    { name: 'Library', href: '/admin/library', icon: BookOpen },
    { name: 'Finance', href: '/admin/finance', icon: CreditCard },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Notices', href: '/admin/notices', icon: Bell },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex bg-slate-900 text-white w-64 min-h-screen flex-col">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <School className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">School Admin</span>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800 rounded-xl p-4 mb-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Pro Plan</h4>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                        <div className="bg-emerald-500 w-[75%] h-full rounded-full" />
                    </div>
                    <p className="text-xs text-slate-400">75% storage used</p>
                </div>

                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-3"
                    onClick={() => window.location.href = '/login'}
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
