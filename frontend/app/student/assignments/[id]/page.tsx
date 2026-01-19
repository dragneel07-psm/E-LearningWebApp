'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Clock, Save, Send, ChevronLeft, Loader2, FileText, CheckCircle, BrainCircuit
} from 'lucide-react';
import { academicAPI, Assessment, Submission } from '@/lib/api';
import Link from 'next/link';

export default function AssignmentSubmissionPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [assignment, setAssignment] = useState<Assessment | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [content, setContent] = useState('');
    const [studentId, setStudentId] = useState('');

    const loadData = useCallback(async () => {
        try {
            const students = await academicAPI.getStudents();
            if (students.length === 0) return;
            const sId = students[0].student_id;
            setStudentId(sId);

            // Get assignment
            const assess = await academicAPI.getAssessment(id);
            setAssignment(assess);

            // Check for existing submission
            const allSubs = await academicAPI.getSubmissions();
            const existing = allSubs.find(s => s.assessment === id && s.student === sId);

            if (existing) {
                setSubmission(existing);
                setContent(existing.content || '');
            }
        } catch (error) {
            console.error('Failed to load assignment:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) loadData();
    }, [id, loadData]);

    async function handleSubmit(asDraft = false) {
        if (!studentId || !assignment) return;
        setSubmitting(true);

        try {
            const data: Partial<Submission> = {
                student: studentId,
                assessment: assignment.assessment_id,
                content: content,
                status: asDraft ? 'draft' : 'submitted'
            };

            if (submission) {
                await academicAPI.updateSubmission(submission.submission_id, data);
            } else {
                await academicAPI.createSubmission(data);
            }

            if (!asDraft) {
                router.push('/student/assignments');
            } else {
                // Refresh to get ID if created
                loadData();
            }
        } catch (error) {
            console.error('Failed to submit:', error);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!assignment) return <div className="p-8">Assignment not found</div>;

    const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <Link href="/student/assignments">
                <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all">
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back to Assignments
                </Button>
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Instructions */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <Badge variant="outline" className="w-fit mb-2 bg-white">{assignment.type}</Badge>
                            <CardTitle className="text-xl">{assignment.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-2">
                                <Clock className="h-4 w-4" /> Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No Date'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none text-slate-600">
                            <h4 className="font-semibold text-slate-900 mb-2">Instructions:</h4>
                            <p>{assignment.description || 'No instructions provided.'}</p>

                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-semibold text-slate-900 mb-2">Grading Criteria:</h4>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Clarity of thought (40%)</li>
                                    <li>Evidence and examples (30%)</li>
                                    <li>Grammar and structure (30%)</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Submission Area */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                Your Response
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[400px]">
                            {isSubmitted ? (
                                <div className="bg-slate-50 p-6 rounded-lg h-full border">
                                    <div className="flex items-center gap-2 text-green-600 font-medium mb-4">
                                        <CheckCircle className="h-5 w-5" /> Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
                                    </div>
                                    <div className="whitespace-pre-wrap text-slate-800 font-serif leading-relaxed">
                                        {content}
                                    </div>
                                </div>
                            ) : (
                                <Textarea
                                    placeholder="Type your essay or response here..."
                                    className="h-full min-h-[300px] resize-none font-serif text-lg leading-relaxed p-6"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                            )}
                        </CardContent>
                        <CardFooter className="border-t bg-slate-50/50 flex justify-between p-4">
                            {isSubmitted ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm text-muted-foreground w-full">
                                        <span>Submitted on {new Date(submission.submitted_at).toLocaleDateString()}</span>
                                        <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                                            {submission.status.toUpperCase()}
                                        </Badge>
                                    </div>

                                    {submission.status === 'submitted' ? (
                                        <Button
                                            onClick={async () => {
                                                if (confirm("Request AI Grading for this assignment?")) {
                                                    try {
                                                        const res = await academicAPI.gradeSubmission(submission.submission_id);
                                                        alert(`Graded! Score: ${res.score}`);
                                                        window.location.reload();
                                                    } catch (error) {
                                                        console.error('Failed to grade submission', error);
                                                        alert("Grading failed.");
                                                    }
                                                }
                                            }}
                                            className="w-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                        >
                                            <BrainCircuit className="mr-2 h-4 w-4" /> Grade with AI
                                        </Button>
                                    ) : null}

                                    {submission.status === 'graded' && ( // Should fetch result really, but let's assume result logic
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg mt-4">
                                            <h4 className="font-bold flex items-center gap-2 text-indigo-900 mb-2">
                                                <BrainCircuit className="h-4 w-4" /> AI Feedback
                                            </h4>
                                            <p className="text-indigo-800 text-sm">
                                                Check your results in the Exams tab for detailed feedback.
                                                (Or I should fetch result here).
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
                                        <Save className="mr-2 h-4 w-4" /> Save Draft
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => alert("AI Proofread not implemented yet")}>
                                            ✨ AI Proofread
                                        </Button>
                                        <Button onClick={() => handleSubmit(false)} disabled={submitting || !content} className="bg-indigo-600 hover:bg-indigo-700">
                                            {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                                            Submit Assignment
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
