'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';
import { Download, CheckCircle2, Users, School } from 'lucide-react';
import { academicAPI, coreAPI, AuditLog } from '@/lib/api';

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('academic');
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        revenue: 0,
    });
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        async function loadData() {
            try {
                const [students, teachers, classes, logs] = await Promise.all([
                    academicAPI.getStudents(),
                    academicAPI.getTeachers(),
                    academicAPI.getClasses(),
                    coreAPI.getAuditLogs().catch(() => []) // Handle error if not implemented
                ]);

                setStats({
                    totalStudents: students.length,
                    totalTeachers: teachers.length,
                    totalClasses: classes.length,
                    revenue: students.length * 1500 // Mock revenue: 1500 per student
                });

                setAuditLogs(logs.slice(0, 10)); // Top 10 recent logs

            } catch (error) {
                console.error("Failed to load report data", error);
            }
        }
        loadData();
    }, []);

    // Mock Data for Charts
    const attendanceTrendData = [
        { date: '01/01', present: 95, absent: 5 },
        { date: '01/02', present: 94, absent: 6 },
        { date: '01/03', present: 96, absent: 4 },
        { date: '01/04', present: 92, absent: 8 },
        { date: '01/05', present: 97, absent: 3 },
        { date: '01/06', present: 95, absent: 5 },
        { date: '01/07', present: 98, absent: 2 },
    ];

    const gradeDistributionData = [
        { grade: 'A', students: 45, fill: '#4ade80' },
        { grade: 'B', students: 80, fill: '#60a5fa' },
        { grade: 'C', students: 30, fill: '#facc15' },
        { grade: 'D', students: 10, fill: '#fb923c' },
        { grade: 'F', students: 5, fill: '#f87171' },
    ];

    const revenueData = [
        { month: 'Jan', amount: 45000 },
        { month: 'Feb', amount: 48000 },
        { month: 'Mar', amount: 52000 },
        { month: 'Apr', amount: 51000 },
        { month: 'May', amount: 58000 },
        { month: 'Jun', amount: 65000 },
    ];

    const storageUsageData = [
        { name: 'Used', value: 75, fill: '#6366f1' },
        { name: 'Free', value: 25, fill: '#e2e8f0' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
                    <p className="text-slate-500">Insights into your school&apos;s performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select defaultValue="this_month">
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                            <SelectItem value="this_year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="academic" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-white border p-1 rounded-lg h-12">
                    <TabsTrigger value="academic" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 py-2 rounded-md transition-all">Academic</TabsTrigger>
                    <TabsTrigger value="financial" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 px-6 py-2 rounded-md transition-all">Financial</TabsTrigger>
                    <TabsTrigger value="system" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 px-6 py-2 rounded-md transition-all">System</TabsTrigger>
                </TabsList>

                {/* Academic Reports */}
                <TabsContent value="academic" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalStudents}</div>
                                <p className="text-xs text-green-500 mt-1 flex items-center">
                                    <ArrowUpRight className="h-3 w-3 mr-1" /> +5% from last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Average Attendance</CardTitle>
                                <School className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">95.2%</div>
                                <p className="text-xs text-green-500 mt-1 flex items-center">
                                    <ArrowUpRight className="h-3 w-3 mr-1" /> +0.5% from last week
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Active Classes</CardTitle>
                                <School className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalClasses}</div>
                                <p className="text-xs text-slate-400 mt-1">Across all grades</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Attendance Trends (Last 7 Days)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={attendanceTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[80, 100]} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="present" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Student Performance Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={gradeDistributionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="grade" axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                        <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                                            {gradeDistributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Financial Reports */}
                <TabsContent value="financial" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Revenue Growth</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                        <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="border-none shadow-sm bg-indigo-600 text-white">
                                <CardHeader>
                                    <CardTitle className="text-white opacity-90">Total Revenue</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-4xl font-bold">${stats.revenue.toLocaleString()}</div>
                                    <div className="mt-4 text-indigo-100 text-sm">
                                        Projected to reach ${(stats.revenue * 1.2).toLocaleString()} by year end.
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">Outstanding Fees</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((_, i) => (
                                            <div key={i} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
                                                        ST
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">Student {i + 1}</div>
                                                        <div className="text-xs text-slate-500">Grade 10</div>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-red-600 text-sm">$450.00</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* System Reports */}
                <TabsContent value="system" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Storage Usage</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[150px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart innerRadius="70%" outerRadius="100%" barSize={10} data={storageUsageData} startAngle={90} endAngle={-270}>
                                        <RadialBar background dataKey="value" cornerRadius={10} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="text-xl font-bold text-indigo-600">75%</span>
                                        <span className="block text-xs text-slate-400">Used</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">AI Tokens</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[150px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={[{ value: 45, fill: '#8b5cf6' }, { value: 55, fill: '#f1f5f9' }]} innerRadius={40} outerRadius={55} dataKey="value" startAngle={90} endAngle={-270}>
                                            <Cell key="cell-0" fill="#8b5cf6" />
                                            <Cell key="cell-1" fill="#f1f5f9" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="text-xl font-bold text-violet-600">45k</span>
                                        <span className="block text-xs text-slate-400">/ 100k</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="md:col-span-2 border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">System Health</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 p-4 rounded-lg flex items-center justify-between border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-800">Database</div>
                                            <div className="text-xs text-emerald-600">Operational</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-emerald-700">12ms</span>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-lg flex items-center justify-between border border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-emerald-800">API Gateway</div>
                                            <div className="text-xs text-emerald-600">Operational</div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-mono text-emerald-700">99.9% Up</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Recent System/Audit Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">IP Address</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {auditLogs.length > 0 ? (
                                            auditLogs.map((log, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{log.actor}</td>
                                                    <td className="px-4 py-3 text-slate-900">{log.action}</td>
                                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{log.ip_address}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            Success
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            [1, 2, 3, 4, 5].map((_, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-600">2024-03-2{i} 10:30:{10 + i}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">admin@school.com</td>
                                                    <td className="px-4 py-3 text-slate-900">Updated Student Record</td>
                                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">192.168.1.{10 + i}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            Success
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ArrowUpRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M7 7h10v10" />
            <path d="M7 17 17 7" />
        </svg>
    )
}
