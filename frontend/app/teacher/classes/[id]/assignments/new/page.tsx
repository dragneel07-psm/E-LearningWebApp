'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, BrainCircuit, Plus, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { academicAPI, Subject } from '@/lib/api';

export default function CreateAssignmentPage() {
    const params = useParams();
    const router = useRouter();
    const classId = params.id as string;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Subject[]>([]);

    // Form Data
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [questions, setQuestions] = useState<{ id: number; text: string; points: number }[]>([]);
    const [newQuestion, setNewQuestion] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                // Dual Strategy: Check if ID is Subject ID or Class ID
                try {
                    // Try as Subject ID first
                    const numericId = parseInt(classId);
                    if (!isNaN(numericId)) {
                        const course = await academicAPI.getSubject(numericId);
                        setSelectedCourseId(course.id.toString());

                        // It's a Subject ID, so fetch related subjects for this Class
                        const allCourses = await academicAPI.getSubjects();
                        const related = allCourses.filter(c => c.academic_class === course.academic_class);
                        setCourses(related);
                        return;
                    }
                } catch {
                    // Ignore error, proceed to try as Class ID
                }

                // Fallback: Treat as Class ID
                const allCourses = await academicAPI.getSubjects();
                const classCourses = allCourses.filter(c => c.academic_class.toString() === classId);
                setCourses(classCourses);
                if (classCourses.length > 0) setSelectedCourseId(classCourses[0].id.toString());
            } catch (err) {
                console.error("Failed to load courses", err);
            }
        };
        init();
    }, [classId]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const addQuestion = () => {
        if (!newQuestion.trim()) return;
        setQuestions(prev => [...prev, { id: Date.now(), text: newQuestion, points: 5 }]);
        setNewQuestion('');
    };

    const handleAIGenerateQuestions = () => {
        setLoading(true);
        setTimeout(() => {
            const aiQuestions = [
                { id: Date.now() + 1, text: "Explain Newton's Second Law in your own words.", points: 10 },
                { id: Date.now() + 2, text: "Calculate the force required to accelerate a 10kg mass at 3m/s².", points: 5 },
                { id: Date.now() + 3, text: "Describe the difference between mass and weight.", points: 5 }
            ];
            setQuestions(prev => [...prev, ...aiQuestions]);
            setLoading(false);
        }, 1500);
    };

    const handlePublish = async () => {
        if (!selectedCourseId) {
            alert("Please select a valid subject/course.");
            return;
        }
        setLoading(true);
        try {
            await academicAPI.createAssessment({
                course: selectedCourseId,
                title: title,
                description: description,
                type: 'assignment',
                total_marks: questions.reduce((sum, q) => sum + q.points, 0),
                due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
                blooms_level: 'apply' // Default
            });
            // Success
            router.push(`/teacher/classes/${classId}`);
        } catch (error) {
            console.error("Failed to create assignment", error);
            alert("Failed to create assignment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-8 min-h-screen bg-gray-50/50">
            <Link href={`/teacher/classes/${classId}`} className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to Class
            </Link>

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Assignment</h1>
                    <p className="text-muted-foreground mt-1">Configure details, add questions, and set grading rubric.</p>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 
                                ${step === s ? 'border-indigo-600 text-indigo-600 bg-indigo-50' :
                                    step > s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-400'}`}>
                                {step > s ? <CheckCircle className="h-5 w-5" /> : s}
                            </div>
                            {s < 3 && <div className={`w-8 h-0.5 mx-2 ${step > s ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Assignment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Assignment Title</Label>
                            <Input id="title" placeholder="e.g., Weekly Physics Quiz" value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="desc">Learning Objective / Instructions</Label>
                            <Textarea id="desc" placeholder="Describe what students should accomplish..." value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Select Subject</Label>
                                <Select onValueChange={setSelectedCourseId} value={selectedCourseId}>
                                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                                    <SelectContent>
                                        {courses.length > 0 ? courses.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        )) : <SelectItem value="placeholder" disabled>No courses found</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={handleNext} disabled={!title || !selectedCourseId}>Next Step <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 2: Questions */}
            {step === 2 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Questions</CardTitle>
                        <Button variant="outline" onClick={handleAIGenerateQuestions} disabled={loading} className="text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                            <BrainCircuit className="mr-2 h-4 w-4" /> {loading ? 'Generating...' : 'AI Generate Questions'}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Question List */}
                        <div className="space-y-3">
                            {questions.map((q, i) => (
                                <div key={q.id} className="p-4 border rounded-lg bg-slate-50 flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="bg-white border w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                                        <div>
                                            <p className="font-medium text-gray-900">{q.text}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{q.points} points</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setQuestions(posts => posts.filter(p => p.id !== q.id))}>
                                        <Trash2 className="h-4 w-4 text-red-400" />
                                    </Button>
                                </div>
                            ))}
                            {questions.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                    No questions added yet. Use AI or add manually.
                                </div>
                            )}
                        </div>

                        {/* Add Manual Question */}
                        <div className="flex gap-2 items-end pt-4 border-t">
                            <div className="flex-1 space-y-2">
                                <Label>Add Question Manually</Label>
                                <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="Type a question..." />
                            </div>
                            <Button onClick={addQuestion}><Plus className="h-4 w-4" /></Button>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={handleBack}>Back</Button>
                        <Button onClick={handleNext} disabled={questions.length === 0}>Next Step <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 3: Grade & Publish */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Review & Publish</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                            <div className="flex justify-between font-bold">
                                <span>Total Questions</span>
                                <span>{questions.length}</span>
                            </div>
                            <div className="flex justify-between font-bold text-indigo-600">
                                <span>Total Points</span>
                                <span>{questions.reduce((sum, q) => sum + q.points, 0)}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Grading Rubric</Label>
                            <Select defaultValue="standard">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Standard (Points based)</SelectItem>
                                    <SelectItem value="passfail">Pass/Fail</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="ghost" onClick={handleBack}>Back</Button>
                        <Button onClick={handlePublish} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 w-32">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
