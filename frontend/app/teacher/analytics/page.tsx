'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, TrendingUp, AlertCircle, Loader2, UserX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart, Legend, Cell } from 'recharts';
import { aiAPI } from '@/lib/api';

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [timeRange, setTimeRange] = useState('month');

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const result = await aiAPI.getTeacherAnalytics();
            setData(result);
        } catch (error) {
            console.error('Failed to load teacher analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="font-medium">Synthesizing predictive insights...</p>
        </div>
    );

    if (!data || data.error) return (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 m-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-slate-900">Analytics Unavailable</h3>
            <p className="mt-2 text-slate-500">{data?.error || "We couldn't load your analytics. Please ensure you have assigned classes."}</p>
        </div>
    );

    return (
        <div className="p-6 md:p-8 min-h-screen space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Predictive Analytics</h1>
                    <p className="text-slate-500 mt-1">Data-driven performance projections and student risk assessment.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[150px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Last Month</SelectItem>
                            <SelectItem value="term">This Term</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={loadAnalytics} variant="outline" size="icon" className="bg-white">
                        <TrendingUp className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* AI Insight Box */}
            <Card className="border-none bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-sm relative overflow-hidden ring-1 ring-indigo-100">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-indigo-600" />
                        AI Analytics Engine
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Key Insights</h4>
                            <div className="space-y-3">
                                {data.ai_insights.map((insight: string, idx: number) => (
                                    <div key={idx} className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-indigo-100 text-sm text-slate-700 shadow-sm flex gap-3">
                                        <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        <p className="leading-relaxed">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">At-Risk Summary</h4>
                            <div className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-indigo-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h5 className="font-bold text-slate-900">{data.at_risk_count} Students At-Risk</h5>
                                    <Badge className={`${data.at_risk_count > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'} border-none`}>
                                        {data.at_risk_count > 0 ? 'Action Recommended' : 'Low Priority'}
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    {data.at_risk_students.map((student: any) => (
                                        <div key={student.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white/40 border border-slate-50">
                                            <span className="font-medium text-slate-700">{student.name}</span>
                                            <span className={`font-bold ${student.risk_level === 'High' ? 'text-red-500' : 'text-orange-500'}`}>{student.risk_level} Risk</span>
                                        </div>
                                    ))}
                                    {data.at_risk_students.length === 0 && (
                                        <p className="text-slate-400 italic text-center text-xs py-4">No high-risk students identified.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Trend */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center justify-between">
                            <span>Mastery Projection</span>
                            <Badge variant="outline" className="text-xs bg-white">Trend Analysis</Badge>
                        </CardTitle>
                        <CardDescription>Predicted class performance based on historical trends</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.performance_trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line
                                    type="monotone"
                                    dataKey="avgScore"
                                    name="Current Score"
                                    stroke="#4f46e5"
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="classAvg"
                                    name="Benchmark"
                                    stroke="#cbd5e1"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* List: At-Risk Detail */}
                <Card className="border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-800">Risk Intervention</CardTitle>
                        <CardDescription>Early signs of academic withdrawal</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0">
                        <div className="divide-y divide-slate-100">
                            {data.at_risk_students.map((student: any) => (
                                <div key={student.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-slate-900 text-sm">{student.name}</h5>
                                        <Badge className={`${student.risk_level === 'High' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'} border-none text-[10px]`}>
                                            {student.risk_level}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        {student.reasons.map((reason: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-500">
                                                <AlertCircle className="h-3 w-3 text-slate-300" />
                                                <span>{reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Button size="sm" variant="ghost" className="w-full mt-3 h-8 text-[11px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg">
                                        Schedule Mentoring
                                    </Button>
                                </div>
                            ))}
                            {data.at_risk_students.length === 0 && (
                                <div className="p-12 text-center text-slate-400 mt-12">
                                    <UserX className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No interventions needed</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Chart 2: Topic Proficiency */}
                <Card className="lg:col-span-3 border-slate-200 shadow-sm bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-800">Curriculum Mastery Map</CardTitle>
                        <CardDescription>Aggregate performance by subject and topic areas</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topic_mastery} layout="vertical" barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="topic" type="category" width={140} tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="score" name="Mastery Level" radius={[0, 8, 8, 0]}>
                                    {data.topic_mastery.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.score < 60 ? '#f43f5e' : entry.score < 75 ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
