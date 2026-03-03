'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Award, TrendingUp, Clock,
    ChevronRight, Target, BrainCircuit, BarChart3,
    ArrowUpRight
} from 'lucide-react';
import { academicAPI, Result, Assessment, Subject } from '@/lib/api';

type ResultWithMeta = Result & {
    assessmentDetails?: Assessment;
    subjectDetails?: Subject;
    percentage?: number;
};

function toList<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).results)) {
        return (payload as any).results as T[];
    }
    return [];
}

export default function StudentGradesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<ResultWithMeta[]>([]);
    const [subjectMastery, setSubjectMastery] = useState<Array<{ name: string; progress: number }>>([]);
    const [stats, setStats] = useState({
        averageScore: 0,
        completedAssessments: 0,
        totalXp: 0,
        topSubject: 'N/A',
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [myStudent, allResultsRaw, allAssessmentsRaw, allSubjectsRaw] = await Promise.all([
                    academicAPI.getMyStudent(),
                    academicAPI.getResults().catch(() => []),
                    academicAPI.getAssessments().catch(() => []),
                    academicAPI.getSubjects().catch(() => []),
                ]);

                const allResults = toList<Result>(allResultsRaw).filter((result) => String(result.student) === String(myStudent.id));
                const allAssessments = toList<Assessment>(allAssessmentsRaw);
                const allSubjects = toList<Subject>(allSubjectsRaw);

                const assessmentMap = new Map(allAssessments.map((assessment) => [String(assessment.assessment_id), assessment]));
                const subjectMap = new Map(allSubjects.map((subject) => [Number(subject.id), subject]));

                const enriched = allResults.map((result) => {
                    const assessmentDetails = assessmentMap.get(String(result.assessment));
                    const subjectDetails = assessmentDetails ? subjectMap.get(Number(assessmentDetails.subject)) : undefined;
                    const totalMarks = Number(assessmentDetails?.total_marks || 0);
                    const percentage = totalMarks > 0
                        ? Math.round((Number(result.score || 0) / totalMarks) * 100)
                        : Number(result.score || 0);

                    return {
                        ...result,
                        assessmentDetails,
                        subjectDetails,
                        percentage,
                    };
                }).sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime());

                setResults(enriched);

                if (enriched.length > 0) {
                    const averageScore = Math.round(enriched.reduce((acc, result) => acc + (result.percentage || 0), 0) / enriched.length);
                    const totalXp = enriched.reduce((acc, result) => acc + Math.round((result.percentage || 0) * 1.5), 0);

                    const subjectGroups = new Map<string, number[]>();
                    enriched.forEach((result) => {
                        const key = result.subjectDetails?.name || 'General';
                        const bucket = subjectGroups.get(key) || [];
                        bucket.push(result.percentage || 0);
                        subjectGroups.set(key, bucket);
                    });

                    const mastery = Array.from(subjectGroups.entries()).map(([name, scores]) => ({
                        name,
                        progress: Math.round(scores.reduce((acc, score) => acc + score, 0) / scores.length),
                    })).sort((a, b) => b.progress - a.progress);

                    setSubjectMastery(mastery.slice(0, 6));
                    setStats({
                        averageScore,
                        completedAssessments: enriched.length,
                        totalXp,
                        topSubject: mastery[0]?.name || 'N/A',
                    });
                } else {
                    setSubjectMastery([]);
                    setStats({ averageScore: 0, completedAssessments: 0, totalXp: 0, topSubject: 'N/A' });
                }
            } catch (error) {
                console.error('Failed to load grades', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    const passCount = useMemo(() => results.filter((result) => (result.percentage || 0) >= 50).length, [results]);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading your academic records...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Award className="h-10 w-10 text-indigo-600" /> Academic Journey
                    </h1>
                    <p className="text-slate-500 font-medium">Tracking your growth, one assessment at a time.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm">
                        <TrendingUp className="mr-2 h-4 w-4 text-emerald-500" /> Export Transcript
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white overflow-hidden relative">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider opacity-80">Average Grade</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black">{stats.averageScore}%</div>
                        <div className="flex items-center mt-2 text-xs font-bold text-indigo-100 bg-white/10 w-fit px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> CURRENT PERFORMANCE
                        </div>
                    </CardContent>
                    <TrendingUp className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10 rotate-12" />
                </Card>

                <Card className="border-slate-200 shadow-lg group hover:border-indigo-200 transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">XP Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900">{stats.totalXp.toLocaleString()}</div>
                        <div className="flex items-center mt-2 text-xs font-bold text-amber-600">Keep pushing for next level!</div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Total Assessments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900">{stats.completedAssessments}</div>
                        <div className="flex items-center mt-2 text-xs font-bold text-slate-500">{passCount} Successfully Passed</div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Top Mastery</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-slate-900 line-clamp-1">{stats.topSubject}</div>
                        <div className="flex items-center mt-2 text-xs font-bold text-emerald-600">Best subject based on results</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900">Recent Assessments</h2>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">ALL SUBJECTS</Badge>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {results.map((result) => (
                            <Card
                                key={result.id}
                                className="group hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer border-slate-200"
                                onClick={() => router.push(`/student/assessments/${result.assessment}/results?result_id=${result.id}`)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${(result.percentage || 0) >= 50 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                                                <Target className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{result.assessmentDetails?.title || result.assessment_title || `Assessment ${result.assessment}`}</h4>
                                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                                    <Clock className="h-3 w-3" /> Submitted on {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-slate-900">{result.percentage || 0}%</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Performance</div>
                                            </div>
                                            <ChevronRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2">
                                        <Badge className={(result.percentage || 0) >= 50 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                                            {(result.percentage || 0) >= 50 ? 'PASSED' : 'RETRY NEEDED'}
                                        </Badge>
                                        {result.ai_feedback && (
                                            <Badge variant="outline" className="border-indigo-200 text-indigo-600 bg-indigo-50/30">
                                                <BrainCircuit className="h-3 w-3 mr-1" /> AI ANALYZED
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {results.length === 0 && (
                            <Card className="border-slate-200">
                                <CardContent className="p-8 text-center text-slate-500">No results published yet.</CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Subject Mastery</h2>
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-indigo-600" /> Topic Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {subjectMastery.map((subject) => (
                                <div key={subject.name} className="space-y-2">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-slate-700">{subject.name}</span>
                                        <span className="text-slate-900">{subject.progress}%</span>
                                    </div>
                                    <Progress value={subject.progress} className="h-1.5" />
                                </div>
                            ))}
                            {subjectMastery.length === 0 && (
                                <p className="text-sm text-slate-500">No mastery data available yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-indigo-900 text-white border-none shadow-2xl relative overflow-hidden">
                        <CardContent className="p-6 relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-500/30 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-indigo-300" />
                                </div>
                                <h4 className="font-bold">Growth Insight</h4>
                            </div>
                            <p className="text-sm text-indigo-100 leading-relaxed mb-4">
                                Your strongest area is <span className="text-emerald-400 font-bold">{stats.topSubject}</span>. Maintain this momentum while improving weaker subjects.
                            </p>
                            <Button className="w-full bg-white text-indigo-900 hover:bg-white/90 font-bold" onClick={() => router.push('/student/learning-path')}>
                                View Learning Plan
                            </Button>
                        </CardContent>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
