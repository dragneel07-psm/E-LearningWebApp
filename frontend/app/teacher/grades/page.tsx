'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Download, Filter, Search, Users,
    BookOpen, Award, TrendingUp, ChevronRight
} from 'lucide-react';
import { academicAPI, Assessment, Student, Subject, Result } from '@/lib/api';
import { toast } from 'sonner';

export default function GradebookPage() {
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [results, setResults] = useState<Result[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const subjectsData = await academicAPI.getSubjects();
                setSubjects(subjectsData);
                if (subjectsData.length > 0) {
                    setSelectedSubject(subjectsData[0].id.toString());
                }
            } catch (error) {
                console.error('Failed to load subjects:', error);
                toast.error('Failed to load subjects');
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (!selectedSubject) return;

        const loadGradebookData = async () => {
            setLoading(true);
            try {
                // In a real app, we'd filter students by the class associated with the subject
                // For now, getting all students and assessments for this subject
                const [studentsData, assessmentsData, resultsData] = await Promise.all([
                    academicAPI.getStudents(),
                    academicAPI.getAssessments(), // Ideally filter by subject in backend
                    academicAPI.getResults()
                ]);

                // Filter assessments by subject
                const subjectAssessments = assessmentsData.filter(a => a.subject === parseInt(selectedSubject));

                setStudents(studentsData);
                setAssessments(subjectAssessments);
                setResults(resultsData);
            } catch (error) {
                console.error('Failed to load gradebook data:', error);
                toast.error('Failed to load gradebook data');
            } finally {
                setLoading(false);
            }
        };
        loadGradebookData();
    }, [selectedSubject]);

    const getScore = (studentId: string, assessmentId: string) => {
        const result = results.find(r => r.student === studentId && r.assessment === assessmentId);
        return result ? result.score : null;
    };

    const calculateAverage = (studentId: string) => {
        const studentResults = results.filter(r => r.student === studentId);
        if (studentResults.length === 0) return 0;
        const total = studentResults.reduce((acc, r) => acc + r.score, 0);
        return Math.round(total / studentResults.length);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Award className="h-8 w-8 text-indigo-600" /> Gradebook
                    </h1>
                    <p className="text-slate-500">Unified view of student performance Across all assessments</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-indigo-600 text-white border-none shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-indigo-100 text-sm font-medium">Active Students</p>
                                <h3 className="text-2xl font-bold">{students.length}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-600 text-white border-none shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-emerald-100 text-sm font-medium">Total Assessments</p>
                                <h3 className="text-2xl font-bold">{assessments.length}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-600 text-white border-none shadow-lg">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Class Average</p>
                                <h3 className="text-2xl font-bold">78%</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Gradebook Table */}
            <Card className="border-slate-200 shadow-xl overflow-hidden bg-white">
                <CardHeader className="border-b bg-slate-50/50">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold">Academic Performance Matrix</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    className="pl-9 pr-4 py-2 border rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                                    placeholder="Search by student name..."
                                />
                            </div>
                            <Button variant="ghost" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center gap-4">
                            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
                            <p className="text-slate-500 animate-pulse">Computing academic matrix...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                        <TableHead className="w-64 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Student Name</TableHead>
                                        {assessments.map(a => (
                                            <TableHead key={a.assessment_id} className="min-w-[120px] text-center">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-800">{a.title}</p>
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-400">{a.type}</p>
                                                </div>
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-32 text-center font-bold text-indigo-600 bg-indigo-50/50">Overall Avg</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => {
                                        const average = calculateAverage(student.id);
                                        return (
                                            <TableRow key={student.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <TableCell className="font-medium text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                                                            {student.first_name?.[0]}{student.last_name?.[0]}
                                                        </div>
                                                        <span>{student.first_name} {student.last_name}</span>
                                                    </div>
                                                </TableCell>
                                                {assessments.map(a => {
                                                    const score = getScore(student.id, a.assessment_id);
                                                    return (
                                                        <TableCell key={a.assessment_id} className="text-center">
                                                            {score !== null ? (
                                                                <Badge variant="outline" className={`font-bold ${score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                                        score >= 60 ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                                                            'text-slate-600 bg-slate-50 border-slate-100'
                                                                    }`}>
                                                                    {score}%
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs">—</span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-center bg-indigo-50/30">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-indigo-700">{average}%</span>
                                                        <div className="h-1 w-12 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-500"
                                                                style={{ width: `${average}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-900">
                    View Comprehensive Report
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
