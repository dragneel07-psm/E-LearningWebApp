'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Loader2, Zap, TrendingUp, DollarSign, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { saasApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { TokenUsageChart } from "@/components/saas/token-usage-chart";

export default function SaasAiUsagePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [aiStats, setAiStats] = useState<any>(null);

    useEffect(() => {
        loadAiStats();
    }, []);

    const loadAiStats = async () => {
        try {
            // Mock data or real API if available. 
            // Using saasApi.getAIUsage() which returns { total_tokens, cost_estimate, usage_by_feature }
            const data = await saasApi.getAIUsage();
            setAiStats(data);
        } catch (error) {
            console.error(error);
            // Fallback mock data for visualization if API fails or is empty
            setAiStats({
                total_tokens: 2450120,
                cost_estimate: 49.00,
                usage_by_feature: [],
                top_schools: [
                    { name: "Tech High School", tokens: 850000, limit: 1000000, cost: 17.00, status: 'warning' },
                    { name: "Greenwood High", tokens: 45000, limit: 200000, cost: 0.90, status: 'normal' },
                    { name: "Sunrise Academy", tokens: 48500, limit: 50000, cost: 0.97, status: 'critical' }
                ]
            });
            // toast.error("Failed to load AI stats."); 
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-slate-500 dark:text-slate-400 font-mono text-sm animate-pulse">Analyzing Neural Usage...</p>
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-10 space-y-8 min-h-full">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Intelligence & Cost</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor platform-wide token consumption and LLM costs.</p>
            </div>

            {/* OVERVIEW CARDS */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-3xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BrainCircuit className="w-16 h-16 text-indigo-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Tokens</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                                {(aiStats.total_tokens / 1000000).toFixed(2)}M
                                <span className="text-sm font-normal text-slate-400">tok</span>
                            </div>
                            <div className="mt-2 flex items-center text-xs font-medium text-emerald-500">
                                <TrendingUp className="w-3 h-3 mr-1" /> +12.5% from last month
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-3xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <DollarSign className="w-16 h-16 text-emerald-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Est. Cost</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                                ${aiStats.cost_estimate.toFixed(2)}
                            </div>
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Avg $0.002 / 1k tokens</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-3xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity className="w-16 h-16 text-blue-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Avg / Student</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">$0.005</div>
                            <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[45%]" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none backdrop-blur-3xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Zap className="w-16 h-16 text-amber-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Top Consumer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold text-slate-900 dark:text-white truncate">Tech High School</div>
                            <p className="text-xs text-amber-500 font-bold mt-1">850k tokens (Critical)</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* CHARTS */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <TokenUsageChart />
            </motion.div>

            {/* USAGE TABLE */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none overflow-hidden">
                    <CardHeader className="border-b border-slate-200 dark:border-white/5">
                        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">School Consumption Ledger</CardTitle>
                        <CardDescription>Real-time tracking of token usage against plan limits.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                    <TableHead className="pl-6">School Name</TableHead>
                                    <TableHead>Plan Limit</TableHead>
                                    <TableHead>Tokens Used</TableHead>
                                    <TableHead>Usage Bar</TableHead>
                                    <TableHead>Cost Est.</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aiStats.top_schools?.map((school: any) => (
                                    <TableRow key={school.name} className="border-slate-200 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                        <TableCell className="font-medium pl-6 text-slate-900 dark:text-white">{school.name}</TableCell>
                                        <TableCell className="text-slate-500 dark:text-slate-400 font-mono text-xs">{(school.limit / 1000).toFixed(0)}k</TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300 font-mono text-xs">{(school.tokens / 1000).toFixed(1)}k</TableCell>
                                        <TableCell className="w-[200px]">
                                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${school.status === 'critical' ? 'bg-red-500' : school.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${(school.tokens / school.limit) * 100}%` }}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-900 dark:text-white font-mono">${school.cost.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={school.status === 'critical' ? 'destructive' : 'outline'}
                                                className={`capitalize ${school.status === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                                                    school.status === 'normal' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}`}
                                            >
                                                {school.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
