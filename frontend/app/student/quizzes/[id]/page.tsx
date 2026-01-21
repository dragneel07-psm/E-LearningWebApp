'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Clock, CheckCircle2, AlertCircle,
    ChevronRight, ChevronLeft, Send,
    Loader2
} from 'lucide-react';
import { academicAPI, Assessment, Question } from '@/lib/api';
import { toast } from 'sonner';

export default function StudentQuizPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const [score, setScore] = useState<{ score: number; max_score: number } | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getAssessment(id);
            setAssessment(data);
            if (data.questions) {
                setQuestions(data.questions);
            } else {
                const qs = await academicAPI.getQuestionsByAssessment(id);
                setQuestions(qs);
            }
            setTimeLeft(data.duration_minutes * 60);
        } catch (error) {
            console.error('Failed to load quiz:', error);
            toast.error('Failed to load quiz');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (quizStarted && timeLeft > 0 && !quizFinished) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && quizStarted && !quizFinished) {
            handleSubmit();
        }
    }, [quizStarted, timeLeft, quizFinished]);

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            const timeTaken = assessment ? assessment.duration_minutes - Math.floor(timeLeft / 60) : 0;
            const result = await academicAPI.submitExam(id, answers, timeTaken);
            setScore(result);
            setQuizFinished(true);
            toast.success('Quiz submitted successfully!');
        } catch (error) {
            console.error('Submission failed:', error);
            toast.error('Failed to submit quiz');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
    if (!assessment) return <div className="p-12 text-center text-slate-500">Quiz not found</div>;

    if (!quizStarted) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
                <Card className="border-none shadow-2xl overflow-hidden bg-white">
                    <div className="h-2 bg-indigo-600 w-full" />
                    <CardHeader className="text-center pt-10">
                        <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Clock className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900">{assessment.title}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            {assessment.description || 'Welcome to this quiz. Please read the instructions carefully.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pb-10">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</span>
                                <span className="text-xl font-bold text-slate-800">{assessment.duration_minutes} Mins</span>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Questions</span>
                                <span className="text-xl font-bold text-slate-800">{questions.length} Total</span>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p>Once you start, the timer will begin. Do not refresh the page or your progress may be lost.</p>
                        </div>

                        <Button
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-200"
                            onClick={() => setQuizStarted(true)}
                        >
                            Start Quiz
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (quizFinished) {
        const percentage = score ? (score.score / score.max_score) * 100 : 0;
        const passed = percentage >= (assessment.passing_marks / assessment.total_marks) * 100;

        return (
            <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
                <Card className="border-none shadow-2xl overflow-hidden bg-white text-center">
                    <div className={`h-2 w-full ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <CardHeader className="pt-10">
                        <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {passed ? <CheckCircle2 className="h-10 w-10" /> : <AlertCircle className="h-10 w-10" />}
                        </div>
                        <CardTitle className="text-3xl font-black text-slate-900">
                            {passed ? 'Congratulations!' : 'Keep Trying!'}
                        </CardTitle>
                        <CardDescription className="text-lg">
                            You've completed the quiz: <strong>{assessment.title}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pb-10">
                        <div className="py-6">
                            <div className="text-6xl font-black text-slate-900 mb-2">{score?.score}</div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">Total Score Out Of {score?.max_score}</div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>

                        <div className="pt-6">
                            <Button
                                variant="outline"
                                className="w-full h-14 rounded-2xl font-bold border-2"
                                onClick={() => router.push('/student/exams')}
                            >
                                Back to Exams
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
            {/* Header & Timer */}
            <div className="flex items-center justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md py-4 border-b">
                <div className="flex-1">
                    <h1 className="font-bold text-lg text-slate-900 truncate">{assessment.title}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-1 w-32" />
                        <span className="text-xs text-slate-500 font-bold">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
                    <Clock className="h-5 w-5" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Question Card */}
            <Card className="border-none shadow-xl bg-white overflow-hidden">
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                        <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                            {currentQuestion.type.replace('_', ' ')} • {currentQuestion.points} Points
                        </span>
                        <h2 className="text-2xl font-bold text-slate-800 leading-tight">
                            {currentQuestion.text}
                        </h2>
                    </div>

                    {currentQuestion.type === 'mcq' && (
                        <RadioGroup
                            value={answers[currentQuestion.question_id] || ''}
                            onValueChange={(val) => handleAnswerChange(currentQuestion.question_id, val)}
                            className="space-y-3"
                        >
                            {currentQuestion.options.map((option, i) => (
                                <div key={i}>
                                    <RadioGroupItem
                                        value={option}
                                        id={`opt-${i}`}
                                        className="sr-only"
                                    />
                                    <Label
                                        htmlFor={`opt-${i}`}
                                        className={`flex items-center p-5 rounded-2xl border-2 transition-all cursor-pointer group hover:bg-slate-50 ${answers[currentQuestion.question_id] === option
                                                ? 'border-indigo-600 bg-indigo-50/50'
                                                : 'border-slate-100'
                                            }`}
                                    >
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${answers[currentQuestion.question_id] === option
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-slate-200 group-hover:border-slate-300'
                                            }`}>
                                            {answers[currentQuestion.question_id] === option && <div className="h-2 w-2 bg-white rounded-full" />}
                                        </div>
                                        <span className={`text-lg font-medium ${answers[currentQuestion.question_id] === option ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {option}
                                        </span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}

                    {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'long_answer') && (
                        <textarea
                            className="w-full h-40 p-5 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all text-lg"
                            placeholder="Type your answer here..."
                            value={answers[currentQuestion.question_id] || ''}
                            onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                        />
                    )}

                    <div className="pt-8 flex items-center justify-between border-t border-slate-100">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            disabled={currentQuestionIndex === 0}
                            className="rounded-2xl font-bold h-14 px-8"
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
                        </Button>

                        {currentQuestionIndex === questions.length - 1 ? (
                            <Button
                                size="lg"
                                className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold h-14 px-8 shadow-lg shadow-indigo-100"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Send className="mr-2 h-5 w-5" />}
                                Submit Quiz
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-bold h-14 px-8 shadow-lg shadow-emerald-100"
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            >
                                Next <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
