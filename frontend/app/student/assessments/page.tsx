'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Clock, Calendar, CheckCircle, BrainCircuit, ArrowRight, TrendingUp
} from 'lucide-react';
import { academicAPI, helpers, Assessment, Result, Subject } from '@/lib/api';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Link from 'next/link';

export default function AssessmentDashboard() {
    const [loading, setLoading] = useState(true);
    type ResultWithDetails = Result & {
        assessmentDetails?: Assessment;
        subjectDetails?: Subject;
        percentage?: number;
    };
    const [results, setResults] = useState<ResultWithDetails[]>([]);
    const [upcomingTests, setUpcomingTests] = useState<Assessment[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // Get mock user - in real app from context
            const students = await academicAPI.getStudents();
            if (students.length === 0) return;
            const studentId = students[0].id; // Changed student_id to id (UUID)

            // Fetch data parallel
            const [allAssessments, studentResults] = await Promise.all([
                academicAPI.getAssessments(),
                helpers.getStudentResultsWithDetails(studentId),
            ]);

            // helpers returns object with subjectDetails
            setResults(studentResults as any);

            // Filter upcoming
            const upcoming = allAssessments.filter(a => !studentResults.find(r => r.assessment === a.assessment_id));
            setUpcomingTests(upcoming);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading Assessments...</div>;

    // Mock Data for Charts
    const trendData = [
        { name: 'Unit 1', score: 65, avg: 70 },
        { name: 'Unit 2', score: 72, avg: 71 },
        { name: 'Mid-Term', score: 85, avg: 75 },
        { name: 'Unit 3', score: 82, avg: 76 },
        { name: 'Unit 4', score: 90, avg: 78 },
    ];

    const skillData = [
        { subject: 'Memory', A: 120, fullMark: 150 },
        { subject: 'Analysis', A: 98, fullMark: 150 },
        { subject: 'Application', A: 86, fullMark: 150 },
        { subject: 'Evaluation', A: 99, fullMark: 150 },
        { subject: 'Creation', A: 85, fullMark: 150 },
        { subject: 'Understanding', A: 65, fullMark: 150 },
    ];

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto bg-gray-50/50 min-h-screen">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Exams & Performance</h1>
                    <p className="text-muted-foreground mt-1">Track your progress and analyze detailed performance.</p>
                </div>
            </div>

            {/* 1️⃣ Upcoming Tests Section */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    Upcoming Assessments
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {upcomingTests.length > 0 ? upcomingTests.slice(0, 3).map(test => (
                        <Card key={test.assessment_id} className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className="uppercase text-xs font-bold">{test.type}</Badge>
                                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> 60 mins
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg mb-1">{test.title}</h3>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {test.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                        {test.total_marks} Marks
                                    </span>
                                    <Link href={test.type === 'assignment' ? `/student/assignments/${test.assessment_id}` : `/student/exam/${test.assessment_id}`}>
                                        <Button size="sm" className="gap-1">
                                            Start <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="col-span-3 p-8 text-center bg-white rounded-lg border border-dashed">
                            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                            <p className="text-muted-foreground">You&apos;re all caught up! No upcoming tests.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2️⃣ Analytics & History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left: Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Performance Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                Performance Trend
                            </CardTitle>
                            <CardDescription>Your scores vs class average over time</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <RechartsTooltip />
                                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 8 }} name="Your Score" />
                                    <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeDasharray="5 5" name="Class Avg" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Result History */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {results.map((result) => (
                                    <div key={result.result_id} className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${result.percentage! >= 80 ? 'bg-green-100 text-green-700' :
                                                result.percentage! >= 60 ? 'bg-blue-100 text-blue-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {result.percentage}%
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{result.assessmentDetails?.title || 'Assessment'}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {result.subjectDetails?.name} • Completed on {new Date().toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">{result.score}/{result.assessmentDetails?.total_marks}</div>
                                            {result.ai_feedback && (
                                                <Badge variant="outline" className="mt-1 gap-1 text-xs">
                                                    <BrainCircuit className="h-3 w-3" /> AI Feedback
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Skills & Insights */}
                <div className="space-y-6">
                    {/* Bloom's Taxonomy Radar */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Skill Breakdown</CardTitle>
                            <CardDescription>Based on Bloom&apos;s Taxonomy</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                    <Radar name="Student" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* AI Feedback Summary */}
                    <Card className="bg-gradient-to-br from-indigo-50 to-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-900">
                                <BrainCircuit className="h-5 w-5 text-indigo-600" />
                                AI Insight
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-indigo-800 leading-relaxed mb-4">
                                &ldquo;You&apos;re demonstrating strong <strong>Analysis</strong> skills, particularly in Science subjects.
                                However, your <strong>Understanding</strong> score in theoretical concepts dropped slightly this week.&rdquo;
                            </p>
                            <Button variant="outline" className="w-full text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                                View Detailed Report
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
