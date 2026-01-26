'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Search, ListChecks, Calendar,
    Clock, Users, BarChart2, MoreVertical,
    FileText, Trash2, Edit
} from 'lucide-react';
import { academicAPI, Assessment, Subject } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function TeacherAssessmentsPage() {
    const [loading, setLoading] = useState(true);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [assessmentsData, subjectsData] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getSubjects()
            ]);
            setAssessments(assessmentsData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error('Failed to load assessments', error);
            toast.error('Failed to load assessments');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this assessment?')) return;
        try {
            await academicAPI.deleteAssessment(id);
            toast.success('Assessment deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete assessment');
        }
    };

    const filteredAssessments = assessments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSubjectName = (id: string | number) => {
        const subject = subjects.find(s => s.id.toString() === id.toString());
        return subject ? subject.name : 'Unknown Subject';
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading assessments...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <ListChecks className="h-8 w-8 text-indigo-600" /> Assessments
                    </h1>
                    <p className="text-slate-500">Create and manage quizzes, exams, and assignments</p>
                </div>
                <Link href="/teacher/assessments/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                        <Plus className="h-4 w-4 mr-2" /> New Assessment
                    </Button>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Assessments</p>
                            <h3 className="text-2xl font-bold text-slate-900">{assessments.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Avg. Completion</p>
                            <h3 className="text-2xl font-bold text-slate-900">84%</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pending Grading</p>
                            <h3 className="text-2xl font-bold text-slate-900">12</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and List */}
            <div className="space-y-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search assessments..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssessments.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400 border border-dashed rounded-xl">
                            No assessments found. Create one to get started!
                        </div>
                    ) : (
                        filteredAssessments.map(assessment => (
                            <Card key={assessment.assessment_id} className="border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                <div className="h-1.5 w-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                                            {assessment.type}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                onClick={() => handleDelete(assessment.assessment_id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-slate-900 line-clamp-1">{assessment.title}</CardTitle>
                                    <p className="text-sm text-slate-500 font-medium">{getSubjectName(assessment.subject)}</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center">
                                                <Clock className="h-3.5 w-3.5" />
                                            </div>
                                            <span>{assessment.duration_minutes} mins</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center">
                                                <ListChecks className="h-3.5 w-3.5" />
                                            </div>
                                            <span>{assessment.total_marks} Marks</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-slate-500">Submissions</span>
                                            <span className="text-indigo-600">65%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 w-[65%]"></div>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Due: {assessment.due_date ? new Date(assessment.due_date).toLocaleDateString() : 'No Deadline'}</span>
                                    <Link href={`/teacher/assessments/${assessment.assessment_id}/results`}>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                            View Results <BarChart2 className="ml-1.5 h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
