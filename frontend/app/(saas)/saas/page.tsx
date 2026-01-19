'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CreditCard, School, Users, Server, AlertTriangle, Loader2 } from 'lucide-react';
import { saasApi, Tenant, Invoice } from '@/lib/api/saas';
import { toast } from "sonner";

type TenantWithStats = Tenant & { student_count?: number };

export default function SaasDashboardPage() {
    const [stats, setStats] = useState({
        totalSchools: 0,
        totalStudents: 0,
        monthlyRevenue: 0,
        pendingRevenue: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [tenants, invoices] = await Promise.all([
                saasApi.getTenants(),
                saasApi.getInvoices()
            ]);

            // Calculate Stats
            const totalSchools = tenants ? tenants.length : 0;
            const totalStudents = tenants
                ? (tenants as TenantWithStats[]).reduce((acc, t) => acc + (t.student_count || 0), 0)
                : 0;

            const revenue = invoices
                ? (invoices as Invoice[])
                      .filter((inv) => inv.status === 'paid')
                      .reduce((acc, inv) => acc + parseFloat(inv.amount), 0)
                : 0;

            const pending = invoices
                ? (invoices as Invoice[])
                      .filter((inv) => inv.status === 'pending')
                      .reduce((acc, inv) => acc + parseFloat(inv.amount), 0)
                : 0;

            setStats({
                totalSchools,
                totalStudents,
                monthlyRevenue: revenue,
                pendingRevenue: pending
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load dashboard data.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="p-8 space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                        <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSchools}</div>
                        <p className="text-xs text-muted-foreground">{stats.totalSchools > 0 ? '+1 new' : 'No growth'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">Total enrolled</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.monthlyRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            ${stats.pendingRevenue.toFixed(2)} pending
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. AI Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12%</div>
                        <p className="text-xs text-muted-foreground">Across all tenants</p>
                    </CardContent>
                </Card>
            </div>

            {/* System Health & Alerts */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>System Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Server className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">API Uptime</span>
                            </div>
                            <span className="text-sm text-green-600">99.98%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Activity className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">AI Service Status</span>
                            </div>
                            <span className="text-sm text-green-600">Operational</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Server className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">Storage Usage</span>
                            </div>
                            <div className="w-1/3 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                            </div>
                            <span className="text-sm text-muted-foreground">45%</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">System Update</p>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Scheduled maintenance in 2 days.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
