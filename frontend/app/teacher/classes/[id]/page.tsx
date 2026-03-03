'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Users, BookOpen, ClipboardList, BarChart2, Plus, BrainCircuit, AlertCircle, FileText, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { academicAPI, Subject, Student, Assessment, Lesson, Attendance, Result } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { SafeResponsiveContainer } from '@/components/ui/safe-responsive-container';

type StudentRow = {
    student: Student;
    attendancePct: number;
    risk: 'high' | 'medium' | 'low';
};

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function ClassDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<Subject | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [assignments, setAssignments] = useState<Assessment[]>([]);
    const [metrics, setMetrics] = useState({
        classAverage: 0,
        highestScore: 0,
        atRiskCount: 0,
        distribution: [] as { range: string; count: number; fill: string }[],
        trend: [] as { name: string; avg: number }[]
    });

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);

                const [allSubjectsRaw, allStudentsRaw, allAssessmentsRaw, allResultsRaw, allAttendanceRaw] = await Promise.all([
                    academicAPI.getSubjects().catch(() => []),
                    academicAPI.getStudents().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getResults().catch(() => []),
                    academicAPI.getAttendance().catch(() => []),
                ]);

                const allSubjects = toList<Subject>(allSubjectsRaw);
                const allStudents = toList<Student>(allStudentsRaw);
                const allAssessments = toList<Assessment>(allAssessmentsRaw);
                const allResults = toList<Result>(allResultsRaw);
                const allAttendance = toList<Attendance>(allAttendanceRaw);

                const resolvedCourse =
                    allSubjects.find((subject) => String(subject.id) === id)
                    || allSubjects.find((subject) => String(subject.academic_class) === id)
                    || null;

                setCourse(resolvedCourse);
                if (!resolvedCourse) {
                    setStudents([]);
                    setAssignments([]);
                    setLessons([]);
                    setStudentRows([]);
                    setMetrics({ classAverage: 0, highestScore: 0, atRiskCount: 0, distribution: [], trend: [] });
                    return;
                }

                const classStudents = allStudents.filter(
                    (student) => Number(student.academic_class) === Number(resolvedCourse.academic_class)
                );
                setStudents(classStudents);
                const classStudentIds = new Set(classStudents.map((student) => String(student.id || student.student_id || '')));

                const subjectAssessments = allAssessments.filter(
                    (assessment) => Number(assessment.subject) === Number(resolvedCourse.id)
                );
                setAssignments(subjectAssessments);
                const assessmentById = new Map<string, Assessment>(
                    subjectAssessments.map((assessment) => [String(assessment.assessment_id), assessment])
                );

                const subjectResults = allResults.filter((result) => assessmentById.has(String(result.assessment)));

                const studentAttendanceMap = new Map<string, { total: number; presentLike: number }>();
                for (const record of allAttendance) {
                    const studentId = String(record.student);
                    if (!classStudentIds.has(studentId)) continue;
                    const current = studentAttendanceMap.get(studentId) || { total: 0, presentLike: 0 };
                    current.total += 1;
                    if (record.status === 'present' || record.status === 'late') current.presentLike += 1;
                    studentAttendanceMap.set(studentId, current);
                }

                const studentScoreMap = new Map<string, number[]>();
                const normalizedScores: number[] = [];
                for (const result of subjectResults) {
                    const studentId = String(result.student);
                    const assessment = assessmentById.get(String(result.assessment));
                    const total = Number(assessment?.total_marks || 0);
                    if (!total) continue;
                    const normalized = (Number(result.score || 0) / total) * 100;
                    normalizedScores.push(normalized);
                    const existing = studentScoreMap.get(studentId) || [];
                    existing.push(normalized);
                    studentScoreMap.set(studentId, existing);
                }

                const rows: StudentRow[] = classStudents.map((student) => {
                    const studentId = String(student.id || student.student_id || '');
                    const attendanceStats = studentAttendanceMap.get(studentId);
                    const attendancePct = attendanceStats && attendanceStats.total > 0
                        ? Math.round((attendanceStats.presentLike / attendanceStats.total) * 100)
                        : 0;

                    const scores = studentScoreMap.get(studentId) || [];
                    const avgScore = scores.length > 0
                        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
                        : 0;

                    let risk: StudentRow['risk'] = 'low';
                    if ((scores.length > 0 && avgScore < 60) || (attendanceStats && attendancePct < 75)) risk = 'high';
                    else if ((scores.length > 0 && avgScore < 75) || (attendanceStats && attendancePct < 85)) risk = 'medium';

                    return { student, attendancePct, risk };
                });
                setStudentRows(rows);

                const lessonsData = await academicAPI.getLessons(undefined, Number(resolvedCourse.id)).catch(() => []);
                setLessons(toList<Lesson>(lessonsData));

                if (normalizedScores.length > 0) {
                    const avg = Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length);
                    const max = Math.round(Math.max(...normalizedScores));
                    const atRisk = rows.filter((row) => row.risk === 'high').length;

                    const dist = [
                        { range: 'A (90-100)', count: normalizedScores.filter((score) => score >= 90).length, fill: '#4ade80' },
                        { range: 'B (80-89)', count: normalizedScores.filter((score) => score >= 80 && score < 90).length, fill: '#60a5fa' },
                        { range: 'C (70-79)', count: normalizedScores.filter((score) => score >= 70 && score < 80).length, fill: '#facc15' },
                        { range: 'D (60-69)', count: normalizedScores.filter((score) => score >= 60 && score < 70).length, fill: '#fb923c' },
                        { range: 'F (<60)', count: normalizedScores.filter((score) => score < 60).length, fill: '#f87171' }
                    ];

                    const trendMap = new Map<string, number[]>();
                    for (const result of subjectResults) {
                        const assessment = assessmentById.get(String(result.assessment));
                        if (!assessment) continue;
                        const total = Number(assessment.total_marks || 0);
                        if (!total) continue;
                        const key = assessment.title || 'Assessment';
                        const bucket = trendMap.get(key) || [];
                        bucket.push((Number(result.score || 0) / total) * 100);
                        trendMap.set(key, bucket);
                    }

                    const trend = Array.from(trendMap.entries()).map(([name, scores]) => ({
                        name,
                        avg: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                    })).slice(0, 8);

                    setMetrics({ classAverage: avg, highestScore: max, atRiskCount: atRisk, distribution: dist, trend });
                } else {
                    setMetrics({
                        classAverage: 0,
                        highestScore: 0,
                        atRiskCount: rows.filter((row) => row.risk === 'high').length,
                        distribution: [],
                        trend: [],
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [id]);

    const activeLessons = useMemo(() => lessons.filter((lesson) => lesson.is_published).length, [lessons]);

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
                    <p className="text-muted-foreground mt-1">
                        {course.code ? `Code: ${course.code}` : 'No course code'} • {students.length} students • {activeLessons}/{lessons.length} lessons published
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/teacher/analytics">
                        <Button variant="outline"><BrainCircuit className="h-4 w-4 mr-2" /> AI Analytics</Button>
                    </Link>
                    <Link href={`/teacher/courses/${course.id}/settings`}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">Manage Settings</Button>
                    </Link>
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

                <TabsContent value="students" className="animate-in fade-in-50">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Class Roster ({studentRows.length})</CardTitle>
                            <Link href="/admin/academic/students">
                                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Student</Button>
                            </Link>
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
                                        {studentRows.map((row) => (
                                            <tr key={row.student.id} className="hover:bg-slate-50/50">
                                                <td className="p-4 font-medium text-gray-900">{row.student.first_name} {row.student.last_name}</td>
                                                <td className="p-4 text-slate-600">{row.attendancePct > 0 ? `${row.attendancePct}%` : '-'}</td>
                                                <td className="p-4">
                                                    <Badge variant="secondary" className={row.student.is_active === false ? 'bg-slate-100 text-slate-600 hover:bg-slate-100' : 'bg-green-100 text-green-700 hover:bg-green-100'}>
                                                        {row.student.is_active === false ? 'Inactive' : 'Active'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    {row.risk === 'high' ? (
                                                        <div className="flex items-center text-red-600 gap-1 text-xs font-bold">
                                                            <AlertCircle className="h-3 w-3" /> High Risk
                                                        </div>
                                                    ) : row.risk === 'medium' ? (
                                                        <div className="flex items-center text-orange-600 gap-1 text-xs font-bold">
                                                            <AlertCircle className="h-3 w-3" /> Medium Risk
                                                        </div>
                                                    ) : (
                                                        <span className="text-emerald-600 text-xs font-semibold">Low Risk</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Link href="/teacher/students">
                                                        <Button variant="ghost" size="sm" className="text-indigo-600">View</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                        {studentRows.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-slate-500">No students assigned to this class.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

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
                                {lessons.map((lesson) => (
                                    <div key={lesson.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-indigo-300 transition-colors bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                                                <p className="text-xs text-muted-foreground">Updated {new Date(lesson.updated_at || lesson.created_at || '').toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={lesson.is_published ? 'default' : 'secondary'}>
                                                {lesson.is_published ? 'Published' : 'Draft'}
                                            </Badge>
                                            <Link href={`/teacher/courses/${course.id}/lessons/${lesson.id}`}>
                                                <Button variant="ghost" size="sm">Edit</Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                                {lessons.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                                        No lessons created for this subject yet.
                                    </div>
                                )}
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
                                    {assignments.map((assessment) => (
                                        <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-indigo-300 transition-colors bg-white">
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
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grade Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <SafeResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.distribution.length > 0 ? metrics.distribution : [{ range: 'No Data', count: 0, fill: '#eee' }]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </SafeResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Performance Trend</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <SafeResponsiveContainer width="100%" height="100%">
                                        <LineChart data={metrics.trend.length > 0 ? metrics.trend : [{ name: 'No Data', avg: 0 }]}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="avg" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </SafeResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
