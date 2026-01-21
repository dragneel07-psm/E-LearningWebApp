'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, GraduationCap, FileText, ArrowLeft, Plus, Users, School
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import Link from 'next/link';
import { academicAPI } from '@/lib/api';

type ManagementCardProps = {
    title: string;
    desc: string;
    icon: React.ElementType;
    link: string;
    actionLink?: string;
};

function ManagementCard({ title, desc, icon: Icon, link, actionLink }: ManagementCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground mt-1 mb-4 h-10">{desc}</p>
                <div className="flex gap-2">
                    <Link href={link} className="w-full">
                        <Button variant="outline" size="sm" className="w-full border-slate-200">
                            Manage
                        </Button>
                    </Link>
                    {actionLink && (
                        <Link href={actionLink}>
                            <Button size="sm" variant="ghost" className="px-2">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
    return (
        <Card>
            <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AcademicControlDashboard() {
    const [stats, setStats] = useState({
        total_teachers: 0,
        total_students: 0,
        total_classes: 0,
        total_subjects: 0
    });

    useEffect(() => {
        academicAPI.getStats().then(setStats).catch(console.error);
    }, []);

    // Mock Data for charts (Keep as placeholder for now)
    const curriculumData = [
        { subject: 'Mathematics', covered: 65, target: 100 },
        { subject: 'Science', covered: 78, target: 100 },
        { subject: 'English', covered: 90, target: 100 },
        { subject: 'Social Studies', covered: 82, target: 100 },
        { subject: 'Computer', covered: 55, target: 100 },
    ];

    const performanceData = [
        { subject: 'Math', A: 12, B: 18, fullMark: 30 },
        { subject: 'Science', A: 15, B: 10, fullMark: 30 },
        { subject: 'English', A: 20, B: 5, fullMark: 30 },
        { subject: 'History', A: 10, B: 15, fullMark: 30 },
        { subject: 'Physics', A: 8, B: 12, fullMark: 30 },
        { subject: 'Geography', A: 18, B: 7, fullMark: 30 },
    ];

    return (
        <div className="p-6 space-y-8 bg-slate-50 min-h-screen dark:bg-slate-900">
            {/* Header */}
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Control Center</h1>
                    <p className="text-slate-500 text-sm">Manage curriculum, subjects, and assess academic standards.</p>
                </div>
            </header>

            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Classes" value={stats.total_classes} icon={School} color="bg-indigo-500 text-indigo-500" />
                <StatCard title="Subjects" value={stats.total_subjects} icon={BookOpen} color="bg-emerald-500 text-emerald-500" />
                <StatCard title="Faculty" value={stats.total_teachers} icon={GraduationCap} color="bg-amber-500 text-amber-500" />
                <StatCard title="Students" value={stats.total_students} icon={Users} color="bg-blue-500 text-blue-500" />
            </div>

            {/* Analytics Section */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Curriculum Coverage (Demo)</CardTitle>
                        <CardDescription>Percentage of syllabus completed per subject</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={curriculumData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" domain={[0, 100]} />
                                <YAxis dataKey="subject" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="covered" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} name="Completed %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Subject Performance Radar (Demo)</CardTitle>
                        <CardDescription>Comparative strength across disciplines</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 30]} />
                                <Radar name="Grade A Students" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                                <Radar name="Grade B Students" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                                <Legend />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Management Grid */}
            <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Management Modules</h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <ManagementCard
                        title="Academic Years"
                        desc="Configure academic sessions and terms."
                        icon={GraduationCap}
                        link="/admin/academic/years"
                        actionLink="/admin/academic/years"
                    />
                    <ManagementCard
                        title="Classes & Sections"
                        desc="Configure Grades, Classes, and Sections."
                        icon={School}
                        link="/admin/academic/classes"
                        actionLink="/admin/academic/classes"
                    />
                    <ManagementCard
                        title="Subjects"
                        desc="Manage subject definitions and curriculum."
                        icon={BookOpen}
                        link="/admin/academic/subjects"
                        actionLink="/admin/academic/subjects"
                    />
                    {/* Placeholder links for future sprints */}
                    <ManagementCard
                        title="Student Management"
                        desc="Manage student profiles, enrollments, and progress."
                        icon={Users}
                        link="/admin/academic/students"
                        actionLink="/admin/academic/students"
                    />
                    <ManagementCard
                        title="Teacher Management"
                        desc="Manage faculty, assignments, and workload."
                        icon={GraduationCap}
                        link="/admin/academic/teachers"
                        actionLink="/admin/academic/teachers"
                    />
                </div>
            </div>
        </div>
    );
}
