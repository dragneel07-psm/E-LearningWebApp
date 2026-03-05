'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, GraduationCap, School, CreditCard, BarChart3, Settings, LogOut, Bell, BookOpen, Calendar, Library, Wallet, DollarSign, ClipboardList, FileText, MessageSquare, UserRoundPlus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type NavigationItem = {
    name: string;
    href: string;
    icon: LucideIcon;
    indent?: boolean;
};

const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'ERP Overview', href: '/admin/erp', icon: BarChart3 },
    { name: 'Admissions', href: '/admin/admissions', icon: UserRoundPlus },
    { name: 'Academic Years', href: '/admin/academic/years', icon: Calendar },
    { name: 'Classes', href: '/admin/academic/classes', icon: School },
    { name: 'Timetable', href: '/admin/timetable', icon: Calendar },
    { name: 'Subjects', href: '/admin/academic/subjects', icon: BookOpen },
    { name: 'Assessments', href: '/admin/academic/assessments', icon: ClipboardList },
    { name: 'Exams', href: '/admin/exams', icon: ClipboardList },
    { name: 'Students', href: '/admin/academic/students', icon: GraduationCap },
    { name: 'Teachers', href: '/admin/academic/teachers', icon: Users },
    { name: 'Library', href: '/admin/library', icon: Library },
    { name: 'Finance', href: '/admin/finance', icon: CreditCard },
    { name: 'Fee Structures', href: '/admin/finance/fees', icon: Wallet, indent: true },
    { name: 'Collect Payments', href: '/admin/finance/collect', icon: DollarSign, indent: true },
    { name: 'Financial Reports', href: '/admin/finance/reports', icon: BarChart3, indent: true },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'Communication', href: '/admin/communication', icon: Bell },
    { name: 'Messages', href: '/admin/messages', icon: MessageSquare, indent: true },
    { name: 'Templates', href: '/admin/communication/templates', icon: FileText, indent: true },
    { name: 'Notices', href: '/admin/notices', icon: Bell, indent: true },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full bg-slate-900 text-white w-64 flex-col overflow-hidden">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <School className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">School Admin</span>
                </div>
            </div>

            <nav className="flex-1 min-h-0 overflow-y-auto px-4 space-y-1 pb-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.indent ? 'ml-6 text-xs py-1.5' : ''} ${isActive
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'} ${item.indent ? 'h-4 w-4' : ''}`} />
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
