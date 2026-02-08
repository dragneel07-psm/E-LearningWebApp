'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { FinanceOverview } from './FinanceOverview';
import { FeeStructureManager } from './FeeStructureManager';
import { StudentFeeList } from './StudentFeeList';
import {
    LayoutDashboard,
    Receipt,
    Settings2,
    TrendingUp,
    Wallet,
    Building2,
    CalendarDays
} from 'lucide-react';

export default function FinanceDashboardPage() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="container mx-auto py-8 space-y-8 max-w-7xl px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Institutional Finance v1.0</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Financial Center</h1>
                    <p className="text-slate-500 font-medium">Manage tuition, fee structures, and collection reports</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-xs font-bold text-slate-700">
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                        Term: Fall 2026
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto h-auto min-w-80">
                        <TabsTrigger
                            value="overview"
                            className="rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md transition-all"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="fees"
                            className="rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md transition-all"
                        >
                            <Receipt className="h-3.5 w-3.5 mr-2" /> Student Fees
                        </TabsTrigger>
                        <TabsTrigger
                            value="structures"
                            className="rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md transition-all"
                        >
                            <Settings2 className="h-3.5 w-3.5 mr-2" /> Fee Matrix
                        </TabsTrigger>
                        <TabsTrigger
                            value="reports"
                            className="rounded-xl px-6 py-2.5 text-xs font-black uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md transition-all"
                        >
                            <TrendingUp className="h-3.5 w-3.5 mr-2" /> Reports
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <FinanceOverview />
                </TabsContent>

                <TabsContent value="fees" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <StudentFeeList />
                </TabsContent>

                <TabsContent value="structures" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <FeeStructureManager />
                </TabsContent>

                <TabsContent value="reports" className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                    <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white rounded-full shadow-sm">
                                <TrendingUp className="h-8 w-8 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Financial Reporting</h3>
                                <p className="text-sm text-slate-400 max-w-xs">Detailed audit logs and collection reports are being generated.</p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
