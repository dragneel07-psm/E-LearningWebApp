// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Assessment } from '@/lib/api';

interface UpcomingExamsWidgetProps {
    assessments: Assessment[];
}

export function UpcomingExamsWidget({ assessments }: UpcomingExamsWidgetProps) {
    // Filter and sort upcoming assessments
    const upcoming = assessments
        .filter(a => {
            if (!a.scheduled_at) return false;
            return new Date(a.scheduled_at) > new Date();
        })
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
        .slice(0, 3); // Show max 3

    if (upcoming.length === 0) {
        return (
            <Card className="border-none shadow-sm h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        Upcoming Exams
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-center text-slate-500 text-sm">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-50" />
                    <p>No upcoming exams scheduled.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm h-full">
            <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        Upcoming Exams
                    </span>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                        {upcoming.length} Next
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                {upcoming.map((exam) => (
                    <div key={exam.id} className="group relative pl-4 border-l-2 border-indigo-200 hover:border-indigo-600 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h4 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                                    {exam.title}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    {exam.subject_name || 'Subject'} • {new Date(exam.scheduled_at!).toLocaleDateString()}
                                </p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] uppercase font-bold ${exam.type === 'exam' ? 'border-red-200 text-red-700 bg-red-50' : 'border-blue-200 text-blue-700 bg-blue-50'
                                }`}>
                                {exam.type}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {exam.duration_minutes} mins
                            </span>
                            <span className="flex items-center gap-1">
                                • {exam.total_marks} Marks
                            </span>
                        </div>

                        <Link href={`/student/assessments/${exam.id}`} className="absolute inset-0" />
                    </div>
                ))}

                <Link href="/student/assessments" className="block mt-2">
                    <Button variant="ghost" className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8">
                        View All Assessments <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
