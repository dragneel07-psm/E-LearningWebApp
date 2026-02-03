'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingAPI, FinanceDashboard } from '@/lib/api';
import { Loader2, DollarSign, TrendingUp, TrendingDown, CreditCard, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function FinanceDashboardPage() {
    const [stats, setStats] = useState<FinanceDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            // Need to update API definition in library to accept params if I want filtering
            // For now, fetching default (all time) or I can manually append params if the library method allowed it.
            // Since api.ts getFinanceDashboard doesn't take args yet, I'll rely on backend defaults 
            // OR I should have updated the API method signature.
            // Let's assume I'll come back to fix api.ts signature if I strictly need filtering here.
            // For now, basic load.
            const data = await billingAPI.getFinanceDashboard();
            setStats(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load finance stats');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = (type: 'pdf' | 'excel') => {
        const url = type === 'pdf'
            ? api.reports.getFeeCollectionPDF(dateRange.start, dateRange.end)
            : api.reports.getFeeCollectionExcel(dateRange.start, dateRange.end);

        api.helpers.downloadFile(url, `fee_report.${type}`);
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    if (!stats) return <div className="p-6">Failed to load data.</div>;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Finance Overview</h1>
                    <p className="text-slate-500">Track revenue, expenses, and pending fees.</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 px-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">Reports:</span>
                    </div>
                    <Input
                        type="date"
                        className="w-auto h-8 text-xs"
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                    <span className="text-slate-300">-</span>
                    <Input
                        type="date"
                        className="w-auto h-8 text-xs"
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleDownloadReport('pdf')}>
                        <Download className="h-3 w-3 mr-1" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => handleDownloadReport('excel')}>
                        <Download className="h-3 w-3 mr-1" /> Excel
                    </Button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Revenue</CardDescription>
                        <CardTitle className="text-2xl font-bold flex items-center text-emerald-700">
                            {formatMoney(stats.total_revenue)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" /> Collected to date
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardDescription>Pending Fees</CardDescription>
                        <CardTitle className="text-2xl font-bold text-amber-600">
                            {formatMoney(stats.total_pending)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-amber-500" /> Outstanding balance
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardDescription>Total Expenses</CardDescription>
                        <CardTitle className="text-2xl font-bold text-red-600">
                            {formatMoney(stats.total_expenses)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-red-500" /> Operational costs
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription>Net Balance</CardDescription>
                        <CardTitle className="text-2xl font-bold text-indigo-700">
                            {formatMoney(stats.net_balance)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-indigo-500" /> Available funds
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Collections</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recent_payments.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No recent payments.</p>
                            ) : (
                                stats.recent_payments.map((p: any) => (
                                    <div key={p.payment_id} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm text-slate-900">
                                                {p.student_name || 'Student'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(p.payment_date).toLocaleDateString()} • {p.method}
                                            </p>
                                        </div>
                                        <div className="font-bold text-emerald-600">
                                            +{formatMoney(p.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recent_expenses.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No recent expenses.</p>
                            ) : (
                                stats.recent_expenses.map((e: any) => (
                                    <div key={e.expense_id} className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0">
                                        <div>
                                            <p className="font-medium text-sm text-slate-900">
                                                {e.title}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(e.date).toLocaleDateString()} • {e.category}
                                            </p>
                                        </div>
                                        <div className="font-bold text-red-600">
                                            -{formatMoney(e.amount)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
