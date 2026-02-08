'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    DollarSign, TrendingUp, TrendingDown,
    AlertCircle, CreditCard, PieChart,
    ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { billingAPI, FinanceDashboard } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

export function FinanceOverview() {
    const [data, setData] = useState<FinanceDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const stats = await billingAPI.getFinanceDashboard();
                setData(stats);
            } catch (error) {
                console.error("Failed to load dashboard stats");
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200"></div>
            ))}
        </div>
    );

    const stats = [
        {
            title: 'Total Revenue',
            value: `$${data?.total_revenue.toLocaleString() || '0'}`,
            change: '+12%',
            trend: 'up',
            icon: <DollarSign className="h-6 w-6 text-emerald-600" />,
            color: 'bg-emerald-50',
            border: 'border-emerald-100'
        },
        {
            title: 'Outstanding Fees',
            value: `$${data?.total_pending.toLocaleString() || '0'}`,
            change: '-5%',
            trend: 'down',
            icon: <AlertCircle className="h-6 w-6 text-red-600" />,
            color: 'bg-red-50',
            border: 'border-red-100'
        },
        {
            title: 'Total Expenses',
            value: `$${data?.total_expenses.toLocaleString() || '0'}`,
            change: '+2%',
            trend: 'up',
            icon: <TrendingDown className="h-6 w-6 text-orange-600" />,
            color: 'bg-orange-50',
            border: 'border-orange-100'
        },
        {
            title: 'Net Profit',
            value: `$${((data?.total_revenue || 0) - (data?.total_expenses || 0)).toLocaleString()}`,
            change: '+15%',
            trend: 'up',
            icon: <Activity className="h-6 w-6 text-indigo-600" />,
            color: 'bg-indigo-50',
            border: 'border-indigo-100'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className={`border-none shadow-sm ${stat.border} hover:shadow-md transition-all duration-300`}>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className={`h-12 w-12 rounded-2xl ${stat.color} flex items-center justify-center mb-4`}>
                                    {stat.icon}
                                </div>
                                <Badge variant="outline" className={`text-[10px] font-bold ${stat.trend === 'up' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                    {stat.change}
                                </Badge>
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.title}</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg font-bold">Revenue Trends</CardTitle>
                            <CardDescription>Monthly collection vs projections</CardDescription>
                        </div>
                        <PieChart className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent className="h-64 flex items-center justify-center bg-slate-50/50 m-4 rounded-xl border border-dashed border-slate-200">
                        <div className="text-center space-y-2">
                            <p className="text-sm font-bold text-slate-400 italic">Chart visualization placeholder</p>
                            <p className="text-xs text-slate-300">Revenue data processing for {new Date().getFullYear()}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold">Fee Collection Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-slate-500">Collected</span>
                                <span className="text-emerald-600">72%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[72%] rounded-full"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-slate-500">Partial</span>
                                <span className="text-amber-500">18%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[18%] rounded-full"></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span className="text-slate-500">Unpaid</span>
                                <span className="text-red-500">10%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 w-[10%] rounded-full"></div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <Button className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none font-bold text-xs h-10">
                                Send Reminders
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
