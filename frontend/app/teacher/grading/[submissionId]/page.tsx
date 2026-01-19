'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, BrainCircuit, Save } from 'lucide-react';
import { academicAPI, Submission, Result, Assessment, Student } from '@/lib/api';

export default function GradingPage() {
    const params = useParams();
    const router = useRouter();
    const submissionId = params.submissionId as string;

    const [loading, setLoading] = useState(true);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [grade, setGrade] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const sub = await academicAPI.getSubmission(submissionId);
                setSubmission(sub);

                // Fetch related data
                const [assessmentData, studentData] = await Promise.all([
                    academicAPI.getAssessment(sub.assessment),
                    academicAPI.getStudent(sub.student)
                ]);

                setAssessment(assessmentData);
                setStudent(studentData);

                // If already graded, load the result
                if (sub.result) {
                    const resultData = await academicAPI.getResult(sub.result.result_id);
                    setResult(resultData);
                    setGrade(resultData.score);
                    setFeedback(resultData.teacher_feedback || resultData.ai_feedback || '');
                }

            } catch (error) {
                console.error('Failed to load submission:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [submissionId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await academicAPI.gradeSubmission(submissionId, {
                score: grade,
                teacher_feedback: feedback
            });
            router.push('/teacher/grading');
        } catch (error) {
            console.error('Failed to save grade:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading submission...</div>;
    if (!submission) return <div className="p-8">Submission not found</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-8 min-h-screen bg-gray-50/50">
            <Button variant="ghost" className="mb-6 pl-0 hover:pl-2 transition-all" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Submissions
            </Button>

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Grading Submission</h1>
                    <p className="text-muted-foreground mt-1">
                        Student: {student?.first_name} {student?.last_name} • Assignment: {assessment?.title}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={submission.is_graded ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                        {submission.is_graded ? 'GRADED' : 'PENDING'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
                {/* Left: Student Submission */}
                <Card className="flex flex-col h-full border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-base font-semibold text-gray-700">Student Response</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 font-serif text-lg leading-relaxed text-gray-800 bg-white">
                        {submission.content}
                    </CardContent>
                </Card>

                {/* Right: Grading Panel */}
                <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
                    {/* AI Analysis Card */}
                    <Card className="border-indigo-100 bg-indigo-50/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-indigo-800 text-base">
                                <BrainCircuit className="h-5 w-5" /> AI Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-slate-600">Suggested Score:</span>
                                <span className="text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">{result?.score}/100</span>
                            </div>
                            <div className="text-sm text-slate-700 bg-white p-3 rounded border border-indigo-100">
                                {result?.ai_feedback || "No AI feedback available."}
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs h-7 border-indigo-200 text-indigo-700 bg-white" onClick={() => {
                                    setGrade(result?.score || 0);
                                    setFeedback(result?.ai_feedback || '');
                                }}>
                                    Use AI Suggestion
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Teacher Grading Form */}
                    <Card className="flex-1 flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">Final Grade</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-1">
                            <div className="space-y-2">
                                <Label htmlFor="score">Score (0-{assessment?.total_marks || 100})</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="score"
                                        type="number"
                                        min="0"
                                        max={assessment?.total_marks || 100}
                                        className="w-24 text-lg font-bold"
                                        value={grade}
                                        onChange={(e) => setGrade(Math.min(Number(e.target.value), assessment?.total_marks || 100))}
                                    />
                                    <span className="text-muted-foreground">/ {assessment?.total_marks || 100}</span>
                                </div>
                            </div>

                            <div className="space-y-2 flex-1 flex flex-col">
                                <Label htmlFor="feedback">feedback & Remarks</Label>
                                <Textarea
                                    id="feedback"
                                    className="flex-1 min-h-[150px] resize-none"
                                    placeholder="Enter constructive feedback..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-slate-50 p-4 flex justify-end">
                            <Button size="lg" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                                <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save & Release Grade'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
