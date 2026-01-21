// app/parent/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, AlertCircle, Loader2, Brain, FileText, CheckCircle, Target, HelpCircle } from 'lucide-react';
import { academicAPI, aiAPI, Parent, Student } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function ParentDashboard() {
    const [parentData, setParentData] = useState<Parent | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportLoading, setReportLoading] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchParentData = async () => {
            try {
                const data = await academicAPI.getMyParent();
                setParentData(data);
            } catch (error) {
                console.error('Failed to fetch parent data:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to load dashboard data. Please try again later.',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchParentData();
    }, [toast]);

    const fetchReport = async (studentId: string) => {
        try {
            setReportLoading(studentId);
            const report = await aiAPI.getStudentReport(studentId);
            setSelectedReport(report);
        } catch (error) {
            console.error('Failed to fetch student report:', error);
            toast({
                title: 'Error',
                description: 'Failed to generate AI report. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setReportLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!parentData) {
        return (
            <div className="p-6 text-center">
                <h1 className="text-2xl font-bold">No profile found</h1>
                <p className="text-muted-foreground">We couldn&apos;t find a parent profile associated with your account.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen dark:bg-gray-900">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
                    <p className="text-muted-foreground">Monitor progress for {parentData.user.first_name}&apos;s children.</p>
                </div>
            </header>

            {/* Children Overview */}
            <div className="grid gap-6 md:grid-cols-2">
                {parentData.students.map((child: Student) => (
                    <Card key={child.student_id} className="border-t-4 border-t-primary">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-bold">{child.first_name} {child.last_name}</div>
                                        <div className="text-xs text-muted-foreground font-normal">{child.email}</div>
                                    </div>
                                </div>
                                <Badge variant="secondary">
                                    {(child as any).class_name || 'No Class'}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <span className="text-xs text-muted-foreground block">Focus Score</span>
                                    <span className="text-xl font-bold text-primary">{child.focus_score || 0}%</span>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <span className="text-xs text-muted-foreground block">Learning Streak</span>
                                    <span className="text-xl font-bold text-orange-500">{child.current_streak || 0} Days</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Attendance (Last 30 Days)</span>
                                    <span className="font-medium">{(child as any).attendance_percentage || 0}%</span>
                                </div>
                                <Progress value={(child as any).attendance_percentage || 0} className="h-2" />
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="text-sm font-semibold flex items-center mb-2">
                                    <FileText className="mr-2 h-4 w-4 text-primary" />
                                    Recent Performance
                                </h4>
                                {((child as any).recent_grades || []).length > 0 ? (
                                    <div className="space-y-2">
                                        {((child as any).recent_grades).map((grade: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-md border border-slate-100">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{grade.assessment_title}</div>
                                                    <div className="text-[10px] text-slate-500">{grade.subject}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-primary">{grade.score}/{grade.total_marks}</div>
                                                    <div className={`text-[10px] font-medium ${grade.percentage >= 60 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                        {grade.percentage}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic text-center py-2">No recent scores available.</p>
                                )}
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="text-sm font-semibold flex items-center mb-2">
                                    <Target className="mr-2 h-4 w-4 text-orange-500" />
                                    Upcoming Assessments
                                </h4>
                                {((child as any).upcoming_assessments || []).length > 0 ? (
                                    <div className="space-y-2">
                                        {((child as any).upcoming_assessments).map((exam: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-orange-50/50 p-2 rounded-md border border-orange-100">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900">{exam.title}</div>
                                                    <div className="text-[10px] text-slate-500">{exam.subject}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-orange-600">
                                                        {new Date(exam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <Badge variant="outline" className="text-[8px] h-4 px-1 uppercase bg-white">
                                                        {exam.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic text-center py-2">No upcoming assessments.</p>
                                )}
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <h4 className="text-sm font-semibold flex items-center mb-2">
                                    <AlertCircle className="mr-2 h-4 w-4 text-primary" />
                                    Quick Insights
                                </h4>
                                <ul className="text-xs space-y-2 text-muted-foreground">
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Currently maintaining a {child.current_streak || 0} day learning streak!</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="mr-2">•</span>
                                        <span>Recent focus score of {child.focus_score || 0}% indicates good concentration.</span>
                                    </li>
                                </ul>
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={() => fetchReport(child.student_id)}
                                        disabled={reportLoading === child.student_id}
                                    >
                                        {reportLoading === child.student_id ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                                        ) : (
                                            <><Brain className="mr-2 h-4 w-4" /> View AI Progress Report</>
                                        )}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                                    {selectedReport ? (
                                        <div className="space-y-6">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                                                    <FileText className="h-6 w-6 text-primary" />
                                                    Academic Progress Report
                                                </DialogTitle>
                                                <DialogDescription>
                                                    AI-generated analysis for {selectedReport.student_name}
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-6 py-4">
                                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                                    <h4 className="font-bold text-primary flex items-center gap-2 mb-2">
                                                        <CheckCircle className="h-4 w-4" />
                                                        Executive Summary
                                                    </h4>
                                                    <p className="text-sm leading-relaxed text-slate-700">
                                                        {selectedReport.ai_report.summary}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-bold flex items-center gap-1 text-emerald-600">
                                                            <Target className="h-4 w-4" />
                                                            Strengths
                                                        </h4>
                                                        <ul className="text-xs space-y-1 text-slate-600">
                                                            {selectedReport.ai_report.strengths.map((s: string, i: number) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-emerald-500 font-bold">•</span>
                                                                    {s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-bold flex items-center gap-1 text-orange-600">
                                                            <HelpCircle className="h-4 w-4" />
                                                            Areas for Growth
                                                        </h4>
                                                        <ul className="text-xs space-y-1 text-slate-600">
                                                            {selectedReport.ai_report.weaknesses.map((w: string, i: number) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-orange-500 font-bold">•</span>
                                                                    {w}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="border-t pt-4">
                                                    <h4 className="font-bold text-slate-900 mb-3">Recommendations for Success</h4>
                                                    <div className="space-y-2">
                                                        {selectedReport.ai_report.recommendations.map((r: string, i: number) => (
                                                            <div key={i} className="p-3 bg-slate-50 rounded-lg text-xs border border-slate-100 italic text-slate-600">
                                                                &quot;{r}&quot;
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                            <p className="text-slate-500 font-medium">Analyzing student performance data...</p>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                ))}

                {parentData.students.length === 0 && (
                    <Card className="col-span-full">
                        <CardContent className="p-12 text-center">
                            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-lg">No students linked</h3>
                            <p className="text-muted-foreground">There are no students associated with your parent account yet.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
