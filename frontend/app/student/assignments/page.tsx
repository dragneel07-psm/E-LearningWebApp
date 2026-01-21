'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    FileText, Calendar, CheckCircle, AlertCircle, BookOpen, Upload
} from 'lucide-react';
import { academicAPI, Assessment, Submission } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AssignmentsDashboard() {
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<Assessment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            // Fetch students to find the current student ID (temporary workaround if no 'me' endpoint for student)
            // In a real app, use a dedicated endpoint like /api/student/me/assignments
            // Fetch current student profile directly using "me" endpoint
            const student = await academicAPI.getMyStudent();
            const studentId = student ? student.student_id : null;

            if (!studentId) {
                console.error("No student profile found for current user");
                // For demo purposes, we might want to still show some data or empty state
            }

            const [allAssessments, allSubmissions] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getSubmissions()
            ]);

            // Filter assignments (assuming 'assignment' type check)
            // Note: Adjust filter based on real data structure
            const assignmentTasks = allAssessments.filter(a => a.type === 'assignment' || !a.type); // Default to include if type undefined
            setAssignments(assignmentTasks);

            // Filter submissions for this student
            const mySubmissions = studentId
                ? allSubmissions.filter(s => s.student === studentId)
                : [];
            setSubmissions(mySubmissions);

        } catch (error) {
            console.error("Failed to load assignments:", error);
            toast.error("Failed to load assignments. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // --- Helper Logic ---
    const getDaysUntilDue = (dueDate: string) => {
        if (!dueDate) return 999;
        const due = new Date(dueDate);
        const today = new Date();
        const diffTime = due.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getStatus = (assignmentId: string) => {
        const sub = submissions.find(s => s.assessment === assignmentId);
        if (!sub) return 'pending';
        return sub.status; // 'submitted', 'graded', 'draft'
    };

    const pendingAssignments = assignments.filter(a => {
        const status = getStatus(a.assessment_id || "");
        return status === 'pending' || status === 'draft' || !status;
    });

    const submittedAssignments = assignments.filter(a => {
        const status = getStatus(a.assessment_id || "");
        return status === 'submitted';
    });

    const gradedAssignments = assignments.filter(a => {
        const status = getStatus(a.assessment_id || "");
        return status === 'graded';
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const AssignmentCard = ({ assignment, status }: { assignment: Assessment, status: string }) => {
        const daysUntilDue = getDaysUntilDue(assignment.due_date || '');
        const isOverdue = daysUntilDue < 0;
        const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;
        const sub = submissions.find(s => s.assessment === assignment.assessment_id);

        return (
            <Card className="flex flex-col hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                        {status === 'pending' && isDueSoon ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                Due Soon
                            </Badge>
                        ) : status === 'graded' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                Graded
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                Assignment
                            </Badge>
                        )}
                        {assignment.total_marks && (
                            <span className="text-xs font-medium text-slate-500">{assignment.total_marks} Points</span>
                        )}
                    </div>
                    <CardTitle className="text-lg line-clamp-1 text-slate-800">{assignment.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1 text-sm">
                        {assignment.description || 'No description provided.'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <span>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No Date'}</span>
                        {status === 'pending' && (
                            <span className={`ml-auto font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-slate-500'}`}>
                                {isOverdue ? 'Overdue' : `${daysUntilDue} days left`}
                            </span>
                        )}
                    </div>

                    {status === 'graded' && sub?.result?.score !== undefined && (
                        <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-green-50 rounded-md border border-green-100">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-800">Score: {sub.result.score} / {assignment.total_marks}</span>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-3 border-t bg-slate-50/50">
                    {status === 'pending' ? (
                        <Link href={`/student/assignments/${assignment.assessment_id}`} className="w-full">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
                                <Upload className="h-4 w-4" /> Start Assignment
                            </Button>
                        </Link>
                    ) : (
                        <Button variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                            View Details
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Assignments</h1>
                <p className="text-slate-500 mt-1">Track pending coursework, submit assignments, and view grades.</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-700 font-medium">Pending</p>
                            <p className="text-3xl font-bold text-orange-900 mt-1">{pendingAssignments.length}</p>
                        </div>
                        <AlertCircle className="h-10 w-10 text-orange-500/80" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700 font-medium">Submitted</p>
                            <p className="text-3xl font-bold text-blue-900 mt-1">{submittedAssignments.length}</p>
                        </div>
                        <FileText className="h-10 w-10 text-blue-500/80" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700 font-medium">Graded</p>
                            <p className="text-3xl font-bold text-green-900 mt-1">{gradedAssignments.length}</p>
                        </div>
                        <CheckCircle className="h-10 w-10 text-green-500/80" />
                    </div>
                </Card>
            </div>

            {/* Tabs & List */}
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-6 bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Pending ({pendingAssignments.length})</TabsTrigger>
                    <TabsTrigger value="submitted" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Submitted ({submittedAssignments.length})</TabsTrigger>
                    <TabsTrigger value="graded" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Graded ({gradedAssignments.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-6">
                    {pendingAssignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pendingAssignments.map(a => <AssignmentCard key={a.assessment_id} assignment={a} status="pending" />)}
                        </div>
                    ) : (
                        <EmptyState message="You have no pending assignments! Time to relax." />
                    )}
                </TabsContent>

                <TabsContent value="submitted" className="space-y-6">
                    {submittedAssignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {submittedAssignments.map(a => <AssignmentCard key={a.assessment_id} assignment={a} status="submitted" />)}
                        </div>
                    ) : (
                        <EmptyState message="No submitted assignments to show." icon={FileText} />
                    )}
                </TabsContent>

                <TabsContent value="graded" className="space-y-6">
                    {gradedAssignments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {gradedAssignments.map(a => <AssignmentCard key={a.assessment_id} assignment={a} status="graded" />)}
                        </div>
                    ) : (
                        <EmptyState message="No graded assignments yet." icon={BookOpen} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyState({
    message,
    icon: Icon = CheckCircle,
}: {
    message: string;
    icon?: React.ElementType;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-medium text-slate-700 mb-1">Nothing here</h3>
            <p className="text-slate-500 max-w-sm">{message}</p>
        </div>
    );
}
