'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
    Clock, AlertTriangle, CheckCircle, ArrowRight, ArrowLeft, Flag
} from 'lucide-react';
import { academicAPI, Assessment, Question } from '@/lib/api';

export default function ExamRoomPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    // State
    const [loading, setLoading] = useState(true);
    const [exam, setExam] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [studentId, setStudentId] = useState('');

    // Exam State
    const [started, setStarted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [flags, setFlags] = useState<Record<string, boolean>>({});
    const [timeLeft, setTimeLeft] = useState(0); // seconds

    const loadData = useCallback(async () => {
        try {
            const students = await academicAPI.getStudents();
            if (students.length > 0) setStudentId(students[0].student_id);

            const [assessData, qData] = await Promise.all([
                academicAPI.getAssessment(id),
                academicAPI.getQuestionsByAssessment(id)
            ]);

            setExam(assessData);
            setQuestions(qData.sort((a, b) => a.order - b.order));

            if (assessData.duration_minutes) {
                setTimeLeft(assessData.duration_minutes * 60);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    function startExam() {
        setStarted(true);
    }

    const finishExam = useCallback(async () => {
        setFinished(true);
        // Calculate Score (Simple Mock Logic)
        let score = 0;

        questions.forEach(q => {
            // Mock correct answer check (In real app, backend does this securely)
            // For this demo, let's assume if it's MCQ and matches option 1 or whatever we set in backend mock
            // But backend didn't send 'correct_answer' to frontend ideally? 
            // Actually my serializer sends ALL fields. So I can check `q.correct_answer`.

            if (q.type === 'mcq') {
                // The option string might need exact match
                // Backend populate script set "2x", "ln(x)", etc.
                if (answers[q.question_id] === q['correct_answer' as keyof Question]) { // TS hack as correct_answer might not be in interface yet? No I didn't add it to interface.
                    score += q.points;
                }
            } else {
                // Manual grading for text
                // Assume partial points for demo? Or 0 until graded.
                // We'll give 0 for now.
            }
        });

        // Submit Result
        try {
            if (studentId && exam) {
                await academicAPI.createResult({
                    assessment: exam.assessment_id,
                    student: studentId,
                    score: score, // Preliminary score
                    time_taken_minutes: Math.ceil((exam.duration_minutes! * 60 - timeLeft) / 60),
                    answers_data: answers,
                    ai_feedback: "Pending AI Analysis..."
                });
            }
        } catch (error) {
            console.error("Submission failed", error);
        }
    }, [answers, exam, questions, studentId, timeLeft]);

    useEffect(() => {
        if (id) loadData();
    }, [id, loadData]);

    // Timer
    useEffect(() => {
        if (!started || finished || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    finishExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [started, finished, timeLeft, finishExam]);

    // Format time
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
    if (!exam) return <div className="p-8">Exam not found</div>;

    // Cover Page
    if (!started) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{exam.title}</CardTitle>
                        <CardDescription>{exam.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 text-blue-700 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                <span className="font-medium">Duration</span>
                            </div>
                            <span className="font-bold">{exam.duration_minutes} Mins</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 text-purple-700 rounded-lg">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                <span className="font-medium">Questions</span>
                            </div>
                            <span className="font-bold">{questions.length}</span>
                        </div>
                        <div className="text-sm text-gray-500 text-center mt-4">
                            You cannot pause the exam once started. Good luck!
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full text-lg py-6" onClick={startExam}>Start Exam Now</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Results Page (Immediate)
    if (finished) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Exam Submitted!</CardTitle>
                        <CardDescription>Your answers have been recorded.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-600 mb-6">
                            Your preliminary score for objective questions is calculated.
                            Subjective answers will be graded by your instructor or AI soon.
                        </p>
                        <Button variant="outline" onClick={() => router.push('/student/assessments')}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Exam Interface
    const question = questions[currentQIndex];

    if (!question) return <div className="p-8 text-center text-muted-foreground">No questions found for this exam.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header: Timer & Progress */}
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="font-bold text-lg text-gray-800 line-clamp-1">{exam.title}</div>
                    <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                        <Clock className="h-5 w-5" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
                <Progress value={((currentQIndex + 1) / questions.length) * 100} className="h-1 rounded-none" />
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-medium text-gray-500">Question {currentQIndex + 1} of {questions.length}</span>
                    <Button variant="ghost" size="sm"
                        className={flags[question.question_id] ? "text-orange-500 bg-orange-50" : "text-gray-400"}
                        onClick={() => setFlags(prev => ({ ...prev, [question.question_id]: !prev[question.question_id] }))}>
                        <Flag className="h-4 w-4 mr-1" /> {flags[question.question_id] ? "Flagged" : "Flag"}
                    </Button>
                </div>

                <Card className="min-h-[300px] flex flex-col">
                    <CardContent className="p-6 md:p-8 flex-1">
                        <h2 className="text-xl font-medium text-gray-900 mb-6">{question.text}</h2>

                        {question.type === 'mcq' && question.options ? (
                            <RadioGroup
                                value={answers[question.question_id] || ''}
                                onValueChange={(val) => setAnswers(prev => ({ ...prev, [question.question_id]: val }))}
                                className="space-y-4"
                            >
                                {question.options.map((opt, i) => (
                                    <div key={i} className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${answers[question.question_id] === opt ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                        <RadioGroupItem value={opt} id={`opt-${i}`} />
                                        <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">{opt}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        ) : (
                            <Textarea
                                placeholder="Type your answer here..."
                                className="min-h-[200px] text-lg p-4"
                                value={answers[question.question_id] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [question.question_id]: e.target.value }))}
                            />
                        )}
                    </CardContent>

                    <CardFooter className="bg-gray-50 border-t p-4 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            disabled={currentQIndex === 0}
                            onClick={() => setCurrentQIndex(prev => prev - 1)}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>

                        {currentQIndex === questions.length - 1 ? (
                            <Button className="bg-green-600 hover:bg-green-700 px-8" onClick={finishExam}>
                                Submit Exam <CheckCircle className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button className="px-8" onClick={() => setCurrentQIndex(prev => prev + 1)}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}
