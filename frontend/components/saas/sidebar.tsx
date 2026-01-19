'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    School,
    CreditCard,
    Receipt,
    BrainCircuit,
    Settings,
    ShieldCheck,
    LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removeToken } from '@/lib/auth';

export function SaasSidebar() {
    const pathname = usePathname();

    const routes = [
        {
            label: 'Overview',
            icon: LayoutDashboard,
            href: '/saas',
            color: 'text-sky-500',
        },
        {
            label: 'Schools',
            icon: School,
            href: '/saas/schools',
            color: 'text-violet-500',
        },
        {
            label: 'Subscription Plans',
            icon: CreditCard,
            href: '/saas/plans',
            color: 'text-pink-700',
        },
        {
            label: 'Billing & Revenue',
            icon: Receipt,
            href: '/saas/billing',
            color: 'text-orange-700',
        },
        {
            label: 'AI Usage',
            icon: BrainCircuit,
            href: '/saas/ai',
            color: 'text-emerald-500',
        },
        {
            label: 'System Settings',
            icon: Settings,
            href: '/saas/settings',
            color: 'text-gray-500',
        },
        {
            label: 'Profile & Security',
            icon: ShieldCheck,
            href: '/saas/profile',
            color: 'text-indigo-500',
        },
    ];

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/saas" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        {/* Placeholder for Logo */}
                        <div className="absolute fill-current bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg w-full h-full flex items-center justify-center font-bold text-lg">
                            S
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold">
                        SaaS Admin
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={`text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition ${pathname === route.href ? 'text-white bg-white/10' : 'text-zinc-400'
                                }`}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={`h-5 w-5 mr-3 ${route.color}`} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10"
                    onClick={() => {
                        // Clear auth token
                        removeToken();
                        // Redirect to SaaS Login
                        window.location.href = '/login/saas';
                    }}
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
