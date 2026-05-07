// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { academicAPI, Parent, Student } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ProjectGradesCard } from '@/components/projects/ProjectGradesCard';
import {
    GraduationCap, Loader2, AlertCircle, TrendingUp, TrendingDown,
    Minus, BookOpen, Award,
} from 'lucide-react';

function gradeColor(pct: number) {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-500';
}

function gradeBadge(pct: number) {
    if (pct >= 80) return { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (pct >= 60) return { label: 'Good', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (pct >= 40) return { label: 'Average', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Needs Help', cls: 'bg-red-100 text-red-700 border-red-200' };
}

export default function ParentGradesPage() {
    const { toast } = useToast();
    const [parent, setParent] = useState<Parent | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [resultsLoading, setResultsLoading] = useState(false);

    useEffect(() => {
        academicAPI.getMyParent()
            .then((p) => {
                setParent(p);
                if (p.students.length > 0) setSelectedStudent(p.students[0]);
            })
            .catch(() => toast({ title: 'Error', description: 'Failed to load parent profile.', variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => {
        if (!selectedStudent) return;
        setResultsLoading(true);
        academicAPI.getChildResults(selectedStudent.student_id)
            .then((data) => setResults(Array.isArray(data) ? data : []))
            .catch(() => toast({ title: 'Error', description: 'Failed to load results.', variant: 'destructive' }))
            .finally(() => setResultsLoading(false));
    }, [selectedStudent, toast]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
    );

    if (!parent || parent.students.length === 0) return (
        <div className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No children linked to your account.</p>
        </div>
    );

    // Group results by subject
    const bySubject: Record<string, any[]> = {};
    results.forEach((r) => {
        const sub = r.subject || r.subject_name || 'General';
        if (!bySubject[sub]) bySubject[sub] = [];
        bySubject[sub].push(r);
    });

    // Overall average
    const overallAvg = results.length
        ? Math.round(results.reduce((s, r) => s + (r.percentage ?? 0), 0) / results.length)
        : 0;

    // Subject averages
    const subjectAverages = Object.entries(bySubject).map(([subject, items]) => ({
        subject,
        avg: Math.round(items.reduce((s, r) => s + (r.percentage ?? 0), 0) / items.length),
        count: items.length,
    })).sort((a, b) => b.avg - a.avg);

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Parent Portal</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Grades & Results</h1>
                <p className="text-slate-500 font-medium">Assessment scores and subject performance.</p>
            </div>

            {/* Child selector */}
            {parent.students.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {parent.students.map((s) => (
                        <Button
                            key={s.student_id}
                            size="sm"
                            variant={selectedStudent?.student_id === s.student_id ? 'default' : 'outline'}
                            className="rounded-xl h-9 text-xs font-bold"
                            onClick={() => setSelectedStudent(s)}
                        >
                            {s.first_name} {s.last_name}
                        </Button>
                    ))}
                </div>
            )}

            {resultsLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            ) : results.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No results available yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Card className="border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Average</p>
                                <p className={`text-3xl font-black mt-1 ${gradeColor(overallAvg)}`}>{overallAvg}%</p>
                                <Badge className={`mt-2 text-xs ${gradeBadge(overallAvg).cls}`}>
                                    {gradeBadge(overallAvg).label}
                                </Badge>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Assessments</p>
                                <p className="text-3xl font-black mt-1 text-slate-800">{results.length}</p>
                                <p className="text-xs text-slate-400 mt-1">across {Object.keys(bySubject).length} subjects</p>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 col-span-2 md:col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Best Subject</p>
                                {subjectAverages[0] ? (
                                    <>
                                        <p className="text-base font-black mt-1 text-slate-800 truncate">{subjectAverages[0].subject}</p>
                                        <p className={`text-xl font-black ${gradeColor(subjectAverages[0].avg)}`}>{subjectAverages[0].avg}%</p>
                                    </>
                                ) : <p className="text-slate-400 text-sm mt-2">—</p>}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Subject breakdown */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base font-black flex items-center gap-2">
                                <Award className="h-4 w-4 text-violet-600" /> Subject Performance
                            </CardTitle>
                            <CardDescription>Average score per subject</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {subjectAverages.map(({ subject, avg, count }) => (
                                <div key={subject} className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-sm font-bold text-slate-800">{subject}</span>
                                            <span className="text-xs text-slate-400 ml-2">{count} assessment{count !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black ${gradeColor(avg)}`}>{avg}%</span>
                                            {avg >= 60 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : avg >= 40 ? <Minus className="h-3.5 w-3.5 text-amber-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                                        </div>
                                    </div>
                                    <Progress value={avg} className="h-2" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* All results */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base font-black flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-violet-600" /> All Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {results.slice().reverse().map((r, i) => {
                                    const pct = r.percentage ?? 0;
                                    const badge = gradeBadge(pct);
                                    return (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{r.assessment_title || r.title || 'Assessment'}</p>
                                                <p className="text-xs text-slate-400">
                                                    {r.subject || r.subject_name}
                                                    {r.date ? ` · ${new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-3">
                                                <div className="text-right">
                                                    <p className={`text-sm font-black ${gradeColor(pct)}`}>{r.score ?? r.marks_obtained ?? '—'}/{r.total_marks ?? r.max_marks ?? '—'}</p>
                                                    <p className={`text-xs font-bold ${gradeColor(pct)}`}>{pct}%</p>
                                                </div>
                                                <Badge className={`text-xs ${badge.cls} hidden md:inline-flex`}>{badge.label}</Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Project grades — Phase 9 #6 read-time aggregation */}
                    <ProjectGradesCard detailHrefBase="/parent/projects" />
                </>
            )}
        </div>
    );
}
