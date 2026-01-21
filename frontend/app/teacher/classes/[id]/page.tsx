'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Users, BookOpen, ClipboardList, BarChart2, Plus, BrainCircuit, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { academicAPI, Subject, Student, Assessment } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ClassDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<Subject | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [assignments, setAssignments] = useState<Assessment[]>([]);
    const [metrics, setMetrics] = useState({
        classAverage: 0,
        highestScore: 0,
        atRiskCount: 0,
        distribution: [] as { range: string; count: number; fill: string }[],
        trend: [] as { name: string; avg: number }[]
    });

    // Mock Data placeholders for now
    const lessons = [
        { id: 1, title: 'Introduction to Mechanics', status: 'Published', date: '2025-09-01' },
        { id: 2, title: 'Newton\'s First Law', status: 'Published', date: '2025-09-05' },
        { id: 3, title: 'Newton\'s Second Law', status: 'Draft', date: '2025-09-10' },
    ];

    useEffect(() => {
        async function loadData() {
            try {
                // In real app, get course by ID
                const allCourses = await academicAPI.getSubjects();
                const found = allCourses.find(c => c.id.toString() === id);
                if (found) setCourse(found);

                // Get students for this class (Mock filter implementation)
                const allStudents = await academicAPI.getStudents();
                // Filter logic would depend on backend relationship
                setStudents(allStudents.slice(0, 15));

                // Fetch Assessments
                const allAssessments = await academicAPI.getAssessments();
                const relevantAssessments = found ? allAssessments.filter(a => a.course === found.id.toString()) : allAssessments;
                setAssignments(relevantAssessments);

                // Fetch Results & Calculate Analytics
                try {
                    const allResults = await academicAPI.getResults();
                    const relevantResults = allResults.filter(r => relevantAssessments.some(a => a.assessment_id === r.assessment));

                    if (relevantResults.length > 0) {
                        const scores = relevantResults.map(r => r.score);
                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                        const max = Math.max(...scores);
                        const atRisk = scores.filter(s => s < 60).length;

                        // Grade Distribution
                        const dist = [
                            { range: 'A (90-100)', count: scores.filter(s => s >= 90).length, fill: '#4ade80' },
                            { range: 'B (80-89)', count: scores.filter(s => s >= 80 && s < 90).length, fill: '#60a5fa' },
                            { range: 'C (70-79)', count: scores.filter(s => s >= 70 && s < 80).length, fill: '#facc15' },
                            { range: 'D (60-69)', count: scores.filter(s => s >= 60 && s < 70).length, fill: '#fb923c' },
                            { range: 'F (<60)', count: scores.filter(s => s < 60).length, fill: '#f87171' }
                        ];

                        // Performance Trend (Group by Assessment)
                        const trendMap = new Map<string, number[]>();
                        relevantResults.forEach(r => {
                            const assess = relevantAssessments.find(a => a.assessment_id === r.assessment);
                            if (assess) {
                                if (!trendMap.has(assess.title)) trendMap.set(assess.title, []);
                                trendMap.get(assess.title)?.push(r.score);
                            }
                        });

                        const trend = Array.from(trendMap.entries()).map(([name, scores]) => ({
                            name,
                            avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        })).slice(0, 6);

                        setMetrics({ classAverage: avg, highestScore: max, atRiskCount: atRisk, distribution: dist, trend });
                    }
                } catch (err) {
                    console.error("Failed to load results", err);
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading class details...</div>;
    if (!course) return <div className="p-8">Class not found</div>;

    return (
        <div className="p-6 md:p-8 min-h-screen bg-gray-50/50">
            <Link href="/teacher/classes" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Classes
            </Link>

            <header className="flex justify-between items-start mb-8">
                <div>
                    <Badge variant="outline" className="mb-2 bg-white text-slate-600 font-normal border-slate-200">
                        Class {course.academic_class}
                    </Badge>
                    <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
                    <p className="text-muted-foreground mt-1">Physics Lab 2 • Mon, Wed, Fri</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><BrainCircuit className="h-4 w-4 mr-2" /> AI Assistant</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">Manage Settings</Button>
                </div>
            </header>

            <Tabs defaultValue="students" className="space-y-6">
                <TabsList className="bg-white p-1 border shadow-sm rounded-lg h-auto">
                    <TabsTrigger value="students" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <Users className="h-4 w-4 mr-2" /> Students
                    </TabsTrigger>
                    <TabsTrigger value="lessons" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <BookOpen className="h-4 w-4 mr-2" /> Lessons
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <ClipboardList className="h-4 w-4 mr-2" /> Assignments
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="px-4 py-2 text-sm data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                        <BarChart2 className="h-4 w-4 mr-2" /> Analytics
                    </TabsTrigger>
                </TabsList>

                {/* STUDENTS TAB (Screen 4 Partial) */}
                <TabsContent value="students" className="animate-in fade-in-50">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Class Roster ({students.length})</CardTitle>
                            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Student</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 border-b">
                                        <tr>
                                            <th className="p-4 font-medium">Student Name</th>
                                            <th className="p-4 font-medium">Attendance</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium">Risk Level</th>
                                            <th className="p-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {students.map((student, i) => (
                                            <tr key={student.id} className="hover:bg-slate-50/50">
                                                <td className="p-4 font-medium text-gray-900">{student.first_name} {student.last_name}</td>
                                                <td className="p-4 text-slate-600">{90 - (i * 2)}%</td>
                                                <td className="p-4">
                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                                                </td>
                                                <td className="p-4">
                                                    {i % 5 === 0 ? (
                                                        <div className="flex items-center text-red-600 gap-1 text-xs font-bold">
                                                            <AlertCircle className="h-3 w-3" /> High Range
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button variant="ghost" size="sm" className="text-indigo-600">View</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LESSONS TAB (Screen 5 Partial) */}
                <TabsContent value="lessons">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Lessons & Content</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm"><BrainCircuit className="h-3.5 w-3.5 mr-2 text-indigo-500" /> AI Outline</Button>
                                <Link href={`/teacher/classes/${id}/lessons/new`}>
                                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Create Lesson</Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {lessons.map(lesson => (
                                    <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-indigo-300 transition-colors bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                                                <p className="text-xs text-muted-foreground">Updated {lesson.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={lesson.status === 'Published' ? 'default' : 'secondary'}>
                                                {lesson.status}
                                            </Badge>
                                            <Button variant="ghost" size="sm">Edit</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assignments">
                    {assignments.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                            <p className="mb-4">No assignments active.</p>
                            <Link href={`/teacher/classes/${id}/assignments/new`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus className="h-4 w-4 mr-2" /> Create Assignment
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Assignments</CardTitle>
                                <Link href={`/teacher/classes/${id}/assignments/new`}>
                                    <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Create Assignment</Button>
                                </Link>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {assignments.map(assessment => (
                                        <div key={assessment.assessment_id} className="flex items-center justify-between p-4 border rounded-lg hover:border-indigo-300 transition-colors bg-white">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                    <ClipboardList className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{assessment.title}</h4>
                                                    <p className="text-xs text-muted-foreground">Type: {assessment.type} • Marks: {assessment.total_marks}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline">Active</Badge>
                                                <Link href={`/teacher/grading/list?assessmentId=${assessment.assessment_id}`}>
                                                    <Button variant="ghost" size="sm">Grade</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="analytics">
                    <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Class Average</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{metrics.classAverage}%</div><p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="h-3 w-3 mr-1" /> Based on {assignments.length} assignments</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Highest Score</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{metrics.highestScore}%</div><p className="text-xs text-muted-foreground mt-1">Best Performance</p></CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">At Risk Students</CardTitle></CardHeader>
                                <CardContent><div className="text-2xl font-bold text-red-600">{metrics.atRiskCount}</div><p className="text-xs text-muted-foreground mt-1">Needs intervention</p></CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Grade Distribution Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grade Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.distribution.length > 0 ? metrics.distribution : [{ range: 'No Data', count: 0, fill: '#eee' }]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Performance Trend Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Performance Trend</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={metrics.trend.length > 0 ? metrics.trend : [{ name: 'No Data', avg: 0 }]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="avg" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
