'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Search, Loader2 } from 'lucide-react';
import { academicAPI, Assessment, Subject } from '@/lib/api';
import Link from 'next/link';

export default function AssessmentOversightPage() {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [assessmentsData, subjectsData] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getSubjects()
            ]);
            setAssessments(assessmentsData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Warning: Deleting this assessment will also delete all student results associated with it. Continue?')) return;
        try {
            await academicAPI.deleteAssessment(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete assessment', error);
        }
    }

    const getSubjectName = (id: string) => {
        // Assessment.course is string, Subject.id is number
        const s = subjects.find(sub => sub.id.toString() === id);
        return s ? s.name : 'Unknown Subject';
    };

    const filteredAssessments = assessments.filter(a =>
        a.title.toLowerCase().includes(filter.toLowerCase()) ||
        getSubjectName(a.course).toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assessment Oversight</h1>
                        <p className="text-slate-500 text-sm">Monitor exams and quizzes across all subjects.</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>School-Wide Assessments</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search exams..."
                                className="pl-8"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Total Marks</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredAssessments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No assessments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAssessments.map((a) => (
                                    <TableRow key={a.assessment_id}>
                                        <TableCell className="font-medium text-slate-800">
                                            {a.title}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800">
                                                {getSubjectName(a.course)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${a.type === 'exam' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {a.type.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell>{a.total_marks}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(a.assessment_id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
