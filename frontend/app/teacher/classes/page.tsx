'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Clock, Search, Plus, ChevronRight } from 'lucide-react';
import { academicAPI, Subject, Assessment, Result, Student, Attendance } from '@/lib/api';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

interface EnrichedCourse extends Subject {
    studentCount: number;
    avgPerformance: number;
    hasPerformanceData: boolean;
    attendanceTrend: 'up' | 'down' | 'stable';
    status: 'on-track' | 'needs-attention' | 'intervention';
}

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

function rateForRange(records: Attendance[], from: Date, to: Date): number {
    const filtered = records.filter((record) => {
        const d = new Date(record.date);
        return d >= from && d < to;
    });
    if (filtered.length === 0) return 0;
    const presentLike = filtered.filter((record) => record.status === 'present' || record.status === 'late').length;
    return (presentLike / filtered.length) * 100;
}

export default function ClassManagementPage() {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<EnrichedCourse[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadClasses() {
            try {
                setLoading(true);
                const [subjectsRaw, studentsRaw, assessmentsRaw, resultsRaw, attendanceRaw] = await Promise.all([
                    academicAPI.getSubjects().catch(() => []),
                    academicAPI.getStudents().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getResults().catch(() => []),
                    academicAPI.getAttendance().catch(() => []),
                ]);

                const subjects = toList<Subject>(subjectsRaw);
                const students = toList<Student>(studentsRaw);
                const assessments = toList<Assessment>(assessmentsRaw);
                const results = toList<Result>(resultsRaw);
                const attendance = toList<Attendance>(attendanceRaw);

                const assessmentById = new Map<string, Assessment>();
                assessments.forEach((assessment) => {
                    assessmentById.set(String(assessment.assessment_id), assessment);
                });

                const now = new Date();
                const currentFrom = new Date(now);
                currentFrom.setDate(now.getDate() - 14);
                const previousFrom = new Date(now);
                previousFrom.setDate(now.getDate() - 28);

                const enriched = subjects.map((subject) => {
                    const classStudents = students.filter((student) => Number(student.academic_class) === Number(subject.academic_class));
                    const studentIds = new Set(classStudents.map((student) => String(student.id || student.student_id || '')));

                    const subjectAssessments = assessments.filter((assessment) => Number(assessment.subject) === Number(subject.id));
                    const subjectAssessmentIds = new Set(subjectAssessments.map((assessment) => String(assessment.assessment_id)));

                    const subjectResults = results.filter((result) => subjectAssessmentIds.has(String(result.assessment)));
                    const normalizedScores = subjectResults
                        .map((result) => {
                            const linkedAssessment = assessmentById.get(String(result.assessment));
                            const totalMarks = Number(linkedAssessment?.total_marks || 0);
                            if (!totalMarks) return null;
                            return (Number(result.score || 0) / totalMarks) * 100;
                        })
                        .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));

                    const hasPerformanceData = normalizedScores.length > 0;
                    const avgPerformance = hasPerformanceData
                        ? Math.round(normalizedScores.reduce((sum, value) => sum + value, 0) / normalizedScores.length)
                        : 0;

                    const classAttendance = attendance.filter((record) => studentIds.has(String(record.student)));
                    const currentRate = rateForRange(classAttendance, currentFrom, now);
                    const previousRate = rateForRange(classAttendance, previousFrom, currentFrom);
                    const delta = currentRate - previousRate;

                    let attendanceTrend: EnrichedCourse['attendanceTrend'] = 'stable';
                    if (delta >= 2) attendanceTrend = 'up';
                    else if (delta <= -2) attendanceTrend = 'down';

                    let status: EnrichedCourse['status'] = 'on-track';
                    if ((hasPerformanceData && avgPerformance < 60) || (attendanceTrend === 'down' && avgPerformance < 70)) {
                        status = 'intervention';
                    } else if ((hasPerformanceData && avgPerformance < 75) || attendanceTrend === 'down') {
                        status = 'needs-attention';
                    }

                    return {
                        ...subject,
                        studentCount: classStudents.length,
                        avgPerformance,
                        hasPerformanceData,
                        attendanceTrend,
                        status,
                    };
                });

                setClasses(enriched);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        loadClasses();
    }, []);

    const filteredClasses = useMemo(
        () => classes.filter((course) =>
            course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(course.academic_class).toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(course.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [classes, searchTerm]
    );

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading classes...</div>;

    return (
        <div className="p-8 min-h-screen bg-gray-50/50 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Class Management</h1>
                    <p className="text-muted-foreground">Manage your classes, students, and performance insights.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/academic/classes">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Class
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search classes or subjects..."
                    className="pl-10 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((cls) => (
                    <Link key={cls.id} href={`/teacher/classes/${cls.id}`} className="block transition-transform hover:-translate-y-1">
                        <Card className="h-full border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge variant="outline" className="mb-2 bg-slate-50 text-slate-600 font-normal">
                                            Class {cls.academic_class}
                                        </Badge>
                                        <CardTitle className="text-lg text-gray-900 group-hover:text-indigo-700 transition-colors">
                                            {cls.name}
                                        </CardTitle>
                                    </div>
                                    {cls.status === 'on-track' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200">On Track</Badge>}
                                    {cls.status === 'needs-attention' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Attention</Badge>}
                                    {cls.status === 'intervention' && <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Intervention</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pb-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" /> Students
                                        </span>
                                        <span className="font-semibold text-gray-900">{cls.studentCount}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" /> Average
                                        </span>
                                        <span className={`font-semibold ${cls.hasPerformanceData && cls.avgPerformance < 75 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {cls.hasPerformanceData ? `${cls.avgPerformance}%` : 'No scores'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> Attendance
                                    </span>
                                    <span className={`flex items-center gap-1 font-medium ${cls.attendanceTrend === 'up' ? 'text-green-600' : cls.attendanceTrend === 'down' ? 'text-orange-600' : 'text-slate-500'}`}>
                                        {cls.attendanceTrend === 'up' ? <TrendingUp className="h-3 w-3" /> : cls.attendanceTrend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                                        {cls.attendanceTrend === 'up' ? 'Improving' : cls.attendanceTrend === 'down' ? 'Declining' : 'Stable'}
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 pb-4">
                                <div className="text-xs text-indigo-600 font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Class Details <ChevronRight className="h-3 w-3 ml-1" />
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
