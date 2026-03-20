// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { academicAPI, Assessment } from '@/lib/api';
import { toast } from 'sonner';
import {
    Brain, Loader2, Clock, BookOpen, ChevronRight,
    Search, Calendar, AlertCircle, CheckCircle2, Play
} from 'lucide-react';

function quizStatus(quiz: Assessment): { label: string; cls: string; icon: React.ReactNode } {
    const now = new Date();
    const due = quiz.due_date ? new Date(quiz.due_date) : null;
    if (due && due < now) return { label: 'Overdue', cls: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle className="h-3 w-3" /> };
    const scheduled = quiz.scheduled_at ? new Date(quiz.scheduled_at) : null;
    if (scheduled && scheduled > now) return { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Calendar className="h-3 w-3" /> };
    return { label: 'Available', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> };
}

export default function StudentQuizzesPage() {
    const [quizzes, setQuizzes] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const all = await academicAPI.getAssessments();
                setQuizzes(all.filter((a: Assessment) => a.type === 'quiz'));
            } catch {
                toast.error('Failed to load quizzes');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = quizzes.filter(q =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        (q.subject_name || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <Brain className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Student Portal</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quizzes</h1>
                    <p className="text-slate-500 font-medium">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} available.</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search quizzes…"
                        className="pl-9 h-10 bg-white border-slate-200"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-20 text-center">
                        <Brain className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">
                            {search ? 'No quizzes match your search.' : 'No quizzes available yet.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((quiz) => {
                        const status = quizStatus(quiz);
                        const dueDate = quiz.due_date
                            ? new Date(quiz.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : null;
                        const isOverdue = status.label === 'Overdue';

                        return (
                            <Card key={quiz.assessment_id} className={`border-slate-200 hover:shadow-lg transition-all overflow-hidden ${isOverdue ? 'border-red-200' : ''}`}>
                                <div className={`h-1.5 w-full ${isOverdue ? 'bg-red-400' : status.label === 'Available' ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                                <CardContent className="p-5 space-y-4">
                                    {/* Title + status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 text-base leading-tight">{quiz.title}</h3>
                                            {quiz.subject_name && (
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3" /> {quiz.subject_name}
                                                </p>
                                            )}
                                        </div>
                                        <Badge className={`flex items-center gap-1 text-[10px] shrink-0 border ${status.cls}`}>
                                            {status.icon} {status.label}
                                        </Badge>
                                    </div>

                                    {/* Description */}
                                    {quiz.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2">{quiz.description}</p>
                                    )}

                                    {/* Meta row */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Duration', value: `${quiz.duration_minutes} min`, icon: <Clock className="h-3.5 w-3.5 text-indigo-400" /> },
                                            { label: 'Marks', value: `${quiz.total_marks}`, icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> },
                                            { label: 'Pass', value: `${quiz.passing_marks}`, icon: <Brain className="h-3.5 w-3.5 text-amber-400" /> },
                                        ].map(({ label, value, icon }) => (
                                            <div key={label} className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                                                <div className="flex justify-center mb-0.5">{icon}</div>
                                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{label}</p>
                                                <p className="text-xs font-black text-slate-800">{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Due date */}
                                    {dueDate && (
                                        <p className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                                            <Calendar className="h-3.5 w-3.5" />
                                            {isOverdue ? 'Was due' : 'Due'}: {dueDate}
                                        </p>
                                    )}

                                    {/* CTA */}
                                    <Link href={`/student/quizzes/${quiz.assessment_id}`}>
                                        <Button
                                            className={`w-full h-9 text-xs font-bold rounded-xl gap-2 ${
                                                isOverdue
                                                    ? 'bg-red-500 hover:bg-red-600'
                                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                            }`}
                                            disabled={isOverdue}
                                        >
                                            <Play className="h-3.5 w-3.5" />
                                            {isOverdue ? 'Deadline Passed' : 'Start Quiz'}
                                            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
