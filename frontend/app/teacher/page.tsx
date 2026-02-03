'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Users, FileText, Calendar, MapPin, AlertTriangle,
    ChevronRight, ClipboardList, CheckCircle, TrendingUp
} from 'lucide-react';
import { CreateLessonDialog } from '@/components/create-lesson-dialog';
import { academicAPI, User, usersAPI, coreAPI, aiAPI } from '@/lib/api';
import { AITeachingAssistant } from '@/components/ai-teaching-assistant';
import { MyProfileDialog } from '@/components/my-profile-dialog';
import { AttendanceTrends } from '@/components/attendance-trends';
import Link from 'next/link';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function TeacherDashboard() {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [stats, setStats] = useState({
        totalStudents: 0,
        classesAssigned: 0,
        pendingReviews: 12,
        aiEvaluations: 45
    });
    const [schoolName, setSchoolName] = useState("Teacher");

    // Mock Data for Schedule
    const schedule = [
        { time: '09:00 - 09:45', class: 'Class 10-A', subject: 'Physics', room: 'Lab 2', status: 'upcoming' },
        { time: '10:00 - 10:45', class: 'Class 9-B', subject: 'Physics', room: 'Room 304', status: 'upcoming' },
        { time: '11:15 - 12:00', class: 'Class 11-A', subject: 'Physics (Adv)', room: 'Room 305', status: 'upcoming' },
        { time: '14:00 - 14:45', class: 'Class 10-C', subject: 'Physics', room: 'Online', status: 'upcoming' },
    ];

    const [analytics, setAnalytics] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
        async function loadData() {
            try {
                // Fetch User & Tenant Info
                const me = await usersAPI.getMe();
                setUser(me);
                if (me.tenant) {
                    try {
                        const tenant = await coreAPI.getTenant(me.tenant);
                        setSchoolName(tenant.name);
                    } catch (e) {
                        console.error('Failed to load tenant name', e);
                    }
                }

                // Fetch Stats
                const students = await academicAPI.getStudents().catch(() => []);
                const courses = await academicAPI.getSubjects().catch(() => []);
                setStats(prev => ({
                    ...prev,
                    totalStudents: students.length,
                    classesAssigned: courses.length
                }));

                // Fetch Predictive Analytics
                try {
                    const aiData = await aiAPI.getTeacherAnalytics();
                    setAnalytics(aiData);

                    // Map AI Data to Alerts
                    const newAlerts = [];
                    if (aiData.at_risk_count > 0) {
                        newAlerts.push({
                            id: 1,
                            type: 'alert',
                            title: `${aiData.at_risk_count} Students At-Risk`,
                            desc: `Critical: ${aiData.at_risk_students[0].name} and others show declining trends.`,
                            action: 'View Analytics',
                            link: '/teacher/analytics'
                        });
                    }
                    aiData.ai_insights.forEach((insight: string, i: number) => {
                        if (newAlerts.length < 3) {
                            newAlerts.push({
                                id: i + 2,
                                type: 'warning',
                                title: 'Curriculum Insight',
                                desc: insight,
                                action: 'Manage Lessons',
                                link: '/teacher/courses'
                            });
                        }
                    });
                    setAlerts(newAlerts);
                } catch (e) {
                    console.warn("Predictive analytics failed to load", e);
                }

            } catch (error) {
                console.error('Dashboard load failed:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) return <div className="p-8 flex justify-center text-slate-400">Loading dashboard...</div>;

    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 1. Welcome Section */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Good Morning, {user?.first_name || 'Teacher'} 👋</h1>
                <p className="text-slate-500">{currentDate} • {schoolName}</p>
            </div>

            {/* 2. KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Today&apos;s Classes</CardTitle>
                        <BookOpen className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">4</div>
                        <p className="text-xs text-slate-500 mt-1">Next class in 15 mins</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.totalStudents}</div>
                        <p className="text-xs text-emerald-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" /> +2% this month
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Reviews</CardTitle>
                        <FileText className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.pendingReviews}</div>
                        <p className="text-xs text-amber-600 font-medium mt-1">Requires attention</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">AI Evaluations</CardTitle>
                        <CheckCircle className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.aiEvaluations}</div>
                        <Progress value={65} className="h-1.5 mt-2 bg-purple-100" />
                    </CardContent>
                </Card>
            </div>

            {/* 3. Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: Schedule (2 cols wide on large screens) */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-50">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-indigo-500" /> Today&apos;s Schedule
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-xs text-indigo-600 h-8">View Full Timetable</Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-slate-200">
                                {schedule.map((slot, i) => (
                                    <div key={i} className="relative pl-10 group">
                                        <span className={`absolute left-[11px] top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ring-indigo-100 bg-indigo-500`}></span>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-slate-500 font-mono flex items-center gap-2">
                                                    {slot.time}
                                                    {slot.room === 'Online' && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] h-5">Online</Badge>}
                                                </div>
                                                <div className="font-bold text-slate-900 text-lg">{slot.subject}</div>
                                                <div className="text-sm text-slate-600 flex items-center gap-2">
                                                    <Users className="h-3 w-3" /> {slot.class}
                                                    <span className="text-slate-300">|</span>
                                                    <MapPin className="h-3 w-3" /> {slot.room}
                                                </div>
                                            </div>
                                            <div className="mt-4 sm:mt-0 flex gap-2">
                                                <Button size="sm" variant="outline" className="bg-white">View Materials</Button>
                                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Start Class</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-700">Performance Trends</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Week 1', score: 78 },
                                        { name: 'Week 2', score: 82 },
                                        { name: 'Week 3', score: 75 },
                                        { name: 'Week 4', score: 85 }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                        <AttendanceTrends />
                    </div>
                </div>

                {/* Right Column: Actions & Alerts */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card className="border-none bg-indigo-50/50 shadow-none">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-900">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/teacher/attendance" className="block">
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <CheckCircle className="mr-3 h-5 w-5 text-indigo-500" /> Take Attendance
                                </Button>
                            </Link>
                            <CreateLessonDialog trigger={
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <ClipboardList className="mr-3 h-5 w-5 text-indigo-500" /> Create Lesson
                                </Button>
                            } />
                            <Link href="/teacher/grading" className="block">
                                <Button className="w-full justify-start text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-100 shadow-sm h-12 text-base">
                                    <FileText className="mr-3 h-5 w-5 text-indigo-500" /> Grade Assignments
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Priority Alerts */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs Attention
                            </CardTitle>
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100">{alerts.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <h4 className="text-sm font-semibold text-slate-900">{alert.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 mb-2 leading-relaxed">{alert.desc}</p>
                                        <Link href={alert.link || '#'}>
                                            <Button variant="link" size="sm" className="h-auto p-0 text-indigo-600 text-xs">
                                                {alert.action} <ChevronRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* AI Assistant Overlay */}
            <AITeachingAssistant />

            {/* Profile Edit Dialog */}
            <MyProfileDialog
                open={showProfileEdit}
                onOpenChange={setShowProfileEdit}
                user={user}
                onSuccess={() => { /* Handled by reload potentially */ }}
            />
        </div>
    );
}
