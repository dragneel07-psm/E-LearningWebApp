'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { academicAPI, helpers, Assessment, Result, Subject } from '@/lib/api';

type ResultWithDetails = Result & {
    assessmentDetails?: Assessment;
    subjectDetails?: Subject;
    percentage?: number;
};

export default function ExamsResultsPage() {
    const router = useRouter();
    const [upcomingExams, setUpcomingExams] = useState<Assessment[]>([]);
    const [pastResults, setPastResults] = useState<ResultWithDetails[]>([]); // Results with details
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        console.log('ExamsPage: Starting data fetch...'); // Debug log
        try {
            setLoading(true);

            // 1. Get student ID
            // We fetch the list of students available to this user context
            const students = await academicAPI.getStudents();
            const myStudentId = students.length > 0 ? students[0].id : null;
            console.log('ExamsPage: Found student ID:', myStudentId);

            if (myStudentId) {
                // 2. Fetch Exams (Assessments of type 'exam')
                const allAssessments = await academicAPI.getAssessments();
                const exams = allAssessments.filter(a => a.type === 'exam' && new Date(a.scheduled_at!) > new Date());
                setUpcomingExams(exams);

                // 3. Fetch Results
                const results = await helpers.getStudentResultsWithDetails(myStudentId);
                setPastResults(results as ResultWithDetails[]);
            }
        } catch (error) {
            console.error('Failed to load exams/results', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Exams & Results</h1>
                <p className="text-slate-600">Prepare for upcoming exams and review your performance history.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Upcoming Exams */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800">Upcoming Schedule</h2>
                        {/* <Button variant="outline" size="sm">Download Schedule</Button> */}
                    </div>

                    {upcomingExams.length === 0 ? (
                        <Card className="p-8 text-center text-slate-500 border-dashed">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No upcoming exams scheduled.</p>
                            <p className="text-sm">Enjoy your study time!</p>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {upcomingExams.map((exam) => (
                                <Card key={exam.assessment_id} className="p-5 border-l-4 border-l-indigo-600 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                                    {/* Subject would be ideal here if we mapped course to subject name */}
                                                    Exam
                                                </Badge>
                                                <span className="text-sm text-slate-500 font-medium">
                                                    {new Date(exam.scheduled_at!).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-800">{exam.title}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4 text-indigo-500" />
                                                    {new Date(exam.scheduled_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({exam.duration_minutes} mins)
                                                </div>
                                                {/* <div className="flex items-center gap-1">
                                                    <MapPin className="h-4 w-4 text-indigo-500" />
                                                    Room 304
                                                </div> */}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-center gap-3">
                                            <div className="text-center bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[100px]">
                                                <span className="block text-xs uppercase tracking-wider text-slate-500">Marks</span>
                                                <span className="block text-xl font-bold text-slate-800">{exam.total_marks}</span>
                                            </div>
                                            <Button
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl"
                                                onClick={() => router.push(`/student/quizzes/${exam.assessment_id}`)}
                                            >
                                                Start Exam
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Recent Results */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-800">Recent Results</h2>

                    {pastResults.length === 0 ? (
                        <Card className="p-8 text-center text-slate-500">
                            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>No results available yet.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {pastResults.map((result) => (
                                <Card key={result.result_id} className="p-4 relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div>
                                            <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                {result.assessmentDetails?.title || 'Assessment'}
                                            </h4>
                                            <p className="text-xs text-slate-500">{new Date(result.submitted_at || Date.now()).toLocaleDateString()}</p>
                                        </div>
                                        <GradeBadge percentage={result.percentage!} />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-600">Score</span>
                                            <span className="font-bold text-slate-900">{result.score} <span className="text-slate-400 font-normal">/ {result.assessmentDetails?.total_marks}</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full ${result.percentage! >= 60 ? 'bg-green-500' : result.percentage! >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                style={{ width: `${result.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    {/* <button className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                        View Breakdown <ChevronRight className="h-3 w-3" />
                                    </button> */}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function GradeBadge({ percentage }: { percentage: number }) {
    let grade = 'F';
    let color = 'bg-red-100 text-red-700';

    if (percentage >= 90) { grade = 'A+'; color = 'bg-green-100 text-green-700'; }
    else if (percentage >= 80) { grade = 'A'; color = 'bg-green-50 text-green-700'; }
    else if (percentage >= 70) { grade = 'B'; color = 'bg-blue-100 text-blue-700'; }
    else if (percentage >= 60) { grade = 'C'; color = 'bg-yellow-100 text-yellow-700'; }
    else if (percentage >= 40) { grade = 'D'; color = 'bg-orange-100 text-orange-700'; }

    return (
        <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>
            {grade}
        </span>
    );
}
