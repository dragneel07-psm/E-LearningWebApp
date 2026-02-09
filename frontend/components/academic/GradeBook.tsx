'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { academicAPI, Assessment, Subject, AcademicClass, GradebookData } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Save, FileText, CheckCircle2 } from 'lucide-react';

export default function GradeBook() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [gradebookData, setGradebookData] = useState<GradebookData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Filtered subjects based on class
    const filteredSubjects = selectedClassId
        ? subjects.filter(s => s.academic_class.toString() === selectedClassId)
        : [];

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedSubjectId) {
            loadGradebook();
        } else {
            setGradebookData(null);
        }
    }, [selectedSubjectId]);

    const loadInitialData = async () => {
        try {
            const [classesData, subjectsData] = await Promise.all([
                academicAPI.getClasses(),
                academicAPI.getSubjects()
            ]);
            setClasses(classesData);
            setSubjects(subjectsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load classes/subjects');
        }
    };

    const loadGradebook = async () => {
        if (!selectedSubjectId) return;
        setLoading(true);
        try {
            // @ts-ignore - The API method exists but might have type issues in definition vs usage
            const data = await academicAPI.getGradebook(parseInt(selectedSubjectId));
            setGradebookData(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load gradebook');
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (studentId: string, assessmentId: string, newScore: string) => {
        if (!gradebookData) return;

        const score = newScore === '' ? null : parseInt(newScore);

        if (score !== null && score < 0) {
            toast.error('Score cannot be negative');
            return;
        }

        // Find assessment to validate max marks
        const assessment = gradebookData.assessments.find(a => a.id === assessmentId);
        if (assessment && score !== null && score > assessment.total_marks) {
            toast.error(`Max marks for this assessment: ${assessment.total_marks}`);
            return;
        }

        setGradebookData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                students: prev.students.map(student => {
                    if (student.id !== studentId) return student;
                    return {
                        ...student,
                        results: {
                            ...student.results,
                            [assessmentId]: {
                                ...student.results[assessmentId],
                                score: score
                            }
                        }
                    };
                })
            };
        });
    };

    const saveGrade = async (studentId: string, assessmentId: string) => {
        if (!gradebookData) return;

        const student = gradebookData.students.find(s => s.id === studentId);
        if (!student) return;
        const result = student.results[assessmentId];

        if (result.score === null) return; // Don't save empty scores? Or maybe delete?

        setSaving(true);
        try {
            if (result.result_id) {
                // Update
                await academicAPI.updateResult(result.result_id, { score: result.score });
            } else {
                // Create
                const newResult = await academicAPI.createResult({
                    assessment: assessmentId,
                    student: studentId, // Student ID (UUID)
                    score: result.score
                });

                // Update local state with new result_id to prevent duplicate creates
                setGradebookData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        students: prev.students.map(s => {
                            if (s.id !== studentId) return s;
                            return {
                                ...s,
                                results: {
                                    ...s.results,
                                    [assessmentId]: {
                                        ...s.results[assessmentId],
                                        result_id: newResult.id // Assume API returns id
                                    }
                                }
                            };
                        })
                    };
                });
            }
            toast.success('Grade saved');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save grade');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-indigo-600" /> Gradebook
                    </h1>
                    <p className="text-slate-500">Enter and manage student marks.</p>
                </div>
            </header>

            <Card className="border-0 shadow-sm">
                <CardHeader className="bg-white border-b pb-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 w-full md:w-64">
                            <label className="text-sm font-semibold text-slate-700">Class</label>
                            <Select value={selectedClassId} onValueChange={(val) => {
                                setSelectedClassId(val);
                                setSelectedSubjectId('');
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 w-full md:w-64">
                            <label className="text-sm font-semibold text-slate-700">Subject</label>
                            <Select
                                value={selectedSubjectId}
                                onValueChange={setSelectedSubjectId}
                                disabled={!selectedClassId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredSubjects.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                            <p className="text-slate-500 mt-2">Loading gradebook...</p>
                        </div>
                    ) : !gradebookData ? (
                        <div className="p-12 text-center text-slate-400">
                            Select a class and subject to view the gradebook.
                        </div>
                    ) : gradebookData.students.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            No students found in this class.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[250px] sticky left-0 bg-slate-50 z-10">Student</TableHead>
                                        {gradebookData.assessments.map(assessment => (
                                            <TableHead key={assessment.id} className="min-w-[150px] text-center">
                                                <div className="font-semibold text-slate-900">{assessment.title}</div>
                                                <div className="text-xs font-normal text-slate-500">
                                                    Max: {assessment.total_marks} | {assessment.type}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gradebookData.students.map(student => (
                                        <TableRow key={student.id} className="hover:bg-slate-50/50">
                                            <TableCell className="sticky left-0 bg-white z-10 font-medium text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                {student.name}
                                                <div className="text-xs text-slate-400 font-normal">{student.email}</div>
                                            </TableCell>
                                            {gradebookData.assessments.map(assessment => {
                                                const result = student.results[assessment.id] || { score: null, result_id: null };
                                                return (
                                                    <TableCell key={assessment.id} className="p-2 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Input
                                                                type="number"
                                                                className={`w-20 text-center h-9 ${result.score === null ? 'border-dashed' : 'font-semibold'}`}
                                                                placeholder="-"
                                                                value={result.score === null ? '' : result.score.toString()}
                                                                onChange={(e) => handleScoreChange(student.id, assessment.id, e.target.value)}
                                                                onBlur={() => saveGrade(student.id, assessment.id)}
                                                            />
                                                            {/* Optional visual indicator that it's saved/synced could go here */}
                                                        </div>
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
