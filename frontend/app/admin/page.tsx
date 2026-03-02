'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, School, TrendingUp, ArrowUpRight, ArrowDownRight, UserPlus, FilePlus, Calendar, MoreVertical, CreditCard, BookOpen } from 'lucide-react';
import { academicAPI, usersAPI, billingAPI } from '@/lib/api';
import { XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';

// Dialog Imports
import { AddStudentDialog } from '@/components/add-student-dialog';
import { AddTeacherDialog } from '@/components/add-teacher-dialog';
import { CreateNoticeDialog } from '@/components/create-notice-dialog';
import { ManageScheduleDialog } from '@/components/manage-schedule-dialog';

export default function SchoolAdminDashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalClasses: 0,
        attendanceRate: 94,
        revenue: 0,
        pendingFees: 0,
        loading: true
    });

    const [recentActivity, setRecentActivity] = useState<Array<{ id: number; type: string; message: string; time: string }>>([]);

    // Dialog States
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [showCreateNotice, setShowCreateNotice] = useState(false);
    const [showManageSchedule, setShowManageSchedule] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const [students, teachers, classes, accounts, finance] = await Promise.all([
                    academicAPI.getStudents().catch(e => { console.error("Students fetch failed:", e); return []; }),
                    academicAPI.getTeachers().catch(e => { console.error("Teachers fetch failed:", e); return []; }),
                    academicAPI.getClasses().catch(e => { console.error("Classes fetch failed:", e); return []; }),
                    usersAPI.getAccounts().catch(e => { console.error("Accounts fetch failed:", e); return []; }),
                    billingAPI.getFinanceDashboard().catch(e => {
                        console.error("Finance fetch failed:", e);
                        return { total_revenue: 0, total_pending: 0, total_expenses: 0, net_balance: 0, recent_payments: [], recent_expenses: [] };
                    })
                ]);

                // Calculate robust stats
                const studentCount = accounts.filter(u => u.role === 'student').length || students.length;

                setStats({
                    totalStudents: studentCount,
                    totalTeachers: teachers.length,
                    totalClasses: classes.length,
                    attendanceRate: 94,
                    revenue: finance.total_revenue || 0,
                    pendingFees: finance.total_pending || 0,
                    loading: false
                });


                // Mock Recent Activity
                setRecentActivity([
                    { id: 1, type: 'enrollment', message: 'New student John Doe enrolled in Class 10-A', time: '10:30 AM' },
                    { id: 2, type: 'payment', message: `School fees of $${finance.total_revenue > 0 ? (finance.total_revenue / 10).toFixed(0) : 100} received`, time: '11:45 AM' },
                    { id: 3, type: 'announcement', message: 'Exam schedule published for Grade 12', time: '2:15 PM' },
                    { id: 4, type: 'attendance', message: 'Teacher Sarah marked attendance for Class 8-B', time: '3:00 PM' },
                ]);

            } catch (error) {
                console.error("Dashboard Load Error", error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        }
        loadData();
    }, []);

    // Mock Chart Data
    const enrollmentData = [
        { name: 'Jan', students: 250 },
        { name: 'Feb', students: 380 },
        { name: 'Mar', students: 420 },
        { name: 'Apr', students: 580 },
        { name: 'May', students: 850 },
        { name: 'Jun', students: stats.totalStudents || 1200 },
    ];

    const feeCollectionData = [
        { name: 'Collected', value: stats.revenue || 85, fill: '#6366f1' }, // Indigo
        { name: 'Pending', value: stats.pendingFees || 15, fill: '#10b981' }, // Emerald
    ];

    const KPI_CARDS = [
        {
            title: 'Total Students',
            value: stats.totalStudents.toLocaleString(),
            trend: '+12% from last month',
            trendUp: true,
            icon: GraduationCap,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: 'Teachers',
            value: stats.totalTeachers,
            trend: 'No change',
            trendUp: null,
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Attendance',
            value: `${stats.attendanceRate}%`,
            trend: '+1.2%',
            trendUp: true,
            icon: School,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Revenue',
            value: `$${stats.revenue.toLocaleString()}`,
            trend: stats.pendingFees > 0 ? `$${stats.pendingFees.toLocaleString()} pending` : 'All collected',
            trendUp: stats.pendingFees === 0,
            icon: TrendingUp,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
    ];

    return (
        <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {KPI_CARDS.map((card, idx) => (
                    <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-2">{card.value}</h3>
                                </div>
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                                    <card.icon className={`h-5 w-5 ${card.color}`} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                                {card.trendUp === true && <ArrowUpRight className="h-3 w-3 text-green-600" />}
                                {card.trendUp === false && <ArrowDownRight className="h-3 w-3 text-red-600" />}
                                <span className={card.trendUp === true ? 'text-green-600' : card.trendUp === false ? 'text-red-600' : 'text-slate-500'}>
                                    {card.trend}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Line Chart */}
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">Enrollment Trends (Past 6 Months)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <SafeResponsiveContainer width="100%" height="100%">
                            <AreaChart data={enrollmentData}>
                                <defs>
                                    <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                            </AreaChart>
                        </SafeResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">Fee Collection</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-3xl font-bold text-slate-900 block">
                                    {stats.revenue > 0 ? Math.round((stats.revenue / (stats.revenue + stats.pendingFees)) * 100) : 0}%
                                </span>
                                <span className="text-xs text-slate-500">Collected</span>
                            </div>
                        </div>
                        <SafeResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={feeCollectionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={5}
                                >
                                    {feeCollectionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </SafeResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Activity */}
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold text-slate-800">Recent Activity</CardTitle>
                        <Button variant="ghost" size="sm" className="text-indigo-600">View All</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                    <div className={`mt-1 h-2 w-2 rounded-full ring-2 ring-white
                                            ${activity.type === 'enrollment' ? 'bg-blue-500' :
                                            activity.type === 'payment' ? 'bg-emerald-500' :
                                                activity.type === 'announcement' ? 'bg-orange-500' : 'bg-slate-400'
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-900">{activity.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-slate-800">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button
                            className="h-24 flex flex-col gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-200"
                            onClick={() => setShowAddStudent(true)}
                        >
                            <UserPlus className="h-6 w-6" />
                            Add Student
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => setShowAddTeacher(true)}
                        >
                            <UserPlus className="h-6 w-6" />
                            Add Staff
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => window.location.href = '/admin/finance'}
                        >
                            <CreditCard className="h-6 w-6" />
                            Finance
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => window.location.href = '/admin/library'}
                        >
                            <BookOpen className="h-6 w-6" />
                            Library
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => setShowCreateNotice(true)}
                        >
                            <FilePlus className="h-6 w-6" />
                            Post Notice
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:text-indigo-600"
                            onClick={() => setShowManageSchedule(true)}
                        >
                            <Calendar className="h-6 w-6" />
                            Schedule
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Dialogs */}
            <AddStudentDialog open={showAddStudent} onOpenChange={setShowAddStudent} onSuccess={() => window.location.reload()} />
            <AddTeacherDialog open={showAddTeacher} onOpenChange={setShowAddTeacher} onSuccess={() => window.location.reload()} />
            <CreateNoticeDialog open={showCreateNotice} onOpenChange={setShowCreateNotice} onSuccess={() => { }} />
            <ManageScheduleDialog open={showManageSchedule} onOpenChange={setShowManageSchedule} />
        </div>
    );
}
