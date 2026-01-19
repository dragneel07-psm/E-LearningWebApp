'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Trophy, BrainCircuit, Calendar,
    AlertCircle, TrendingUp, ChevronRight, PlayCircle
} from 'lucide-react';
import { academicAPI, helpers, Course } from '@/lib/api';
import { AITutorChat } from '@/components/ai-tutor-chat';

export default function StudentDashboard() {
    const [loading, setLoading] = useState(true);
    const [studentId, setStudentId] = useState<string>('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [showAITutor, setShowAITutor] = useState(false);

    // Mock Data based on requirements
    const attendance = 92;
    const pendingAssignments = 3;

    // Daily Timetable Mock
    const timetable = [
        { time: '09:00 AM', subject: 'Mathematics', type: 'Lecture', status: 'completed' },
        { time: '10:30 AM', subject: 'Physics', type: 'Lab', status: 'ongoing' },
        { time: '01:00 PM', subject: 'English', type: 'Lecture', status: 'upcoming' },
        { time: '02:30 PM', subject: 'Computer Science', type: 'Lab', status: 'upcoming' },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const student = await academicAPI.getMyStudent();
            setStudentId(student.student_id);
            const c = await helpers.getStudentCourses(student.student_id);
            setCourses(c);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading dashboard...</div>;

    return (
        <div className="space-y-6">

            {/* 1. Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance */}
                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Attendance</p>
                            <h3 className="text-2xl font-bold text-slate-900">{attendance}%</h3>
                            <p className="text-xs text-green-600 font-medium flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" /> +2% this month
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Assignments */}
                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Assignments</p>
                            <h3 className="text-2xl font-bold text-slate-900">{pendingAssignments}</h3>
                            <p className="text-xs text-orange-600 font-medium flex items-center mt-1">
                                <AlertCircle className="h-3 w-3 mr-1" /> Pending
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Exams */}
                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Upcoming Exams</p>
                            <h3 className="text-2xl font-bold text-slate-900">2</h3>
                            <p className="text-xs text-blue-600 font-medium mt-1">Maths & Physics</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Learning Streak */}
                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Learning Streak</p>
                            <h3 className="text-2xl font-bold text-slate-900">7 Days</h3>
                            <p className="text-xs text-purple-600 font-medium mt-1">Keep it up! 🔥</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
                            <BrainCircuit className="h-6 w-6 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2. Main Content Area (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Course Progress */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold text-slate-800">My Learning Progress</CardTitle>
                            <Button variant="ghost" size="sm" className="text-indigo-600 text-xs hover:text-indigo-700 hover:bg-indigo-50">
                                View All
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {courses.slice(0, 3).map((course, idx) => (
                                <div key={course.course_id} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 
                                        ${idx === 0 ? 'bg-indigo-100 text-indigo-600' :
                                            idx === 1 ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-amber-100 text-amber-600'}`}>
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-1">
                                            <h4 className="font-semibold text-slate-900 truncate">{course.subject}</h4>
                                            <span className="text-xs font-bold text-slate-600">{(idx + 1) * 24}%</span>
                                        </div>
                                        <Progress value={(idx + 1) * 24} className="h-2 bg-slate-100" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500" />
                                </div>
                            ))}
                            {courses.length === 0 && (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg dashed border border-slate-200">
                                    No courses assigned yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Schedule */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-slate-800">Today&apos;s Timetable</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-0">
                                {timetable.map((slot, idx) => (
                                    <div key={idx} className="flex relative pb-6 last:pb-0">
                                        {/* Timeline Line */}
                                        {idx !== timetable.length - 1 && (
                                            <div className="absolute top-8 left-2.5 w-0.5 h-full bg-slate-200 -z-10"></div>
                                        )}

                                        {/* Dot Indicator */}
                                        <div className={`h-5 w-5 rounded-full border-4 z-10 mr-4 shrink-0 
                                            ${slot.status === 'completed' ? 'bg-green-500 border-green-100' :
                                                slot.status === 'ongoing' ? 'bg-indigo-500 border-indigo-100' :
                                                    'bg-slate-300 border-slate-100'}`}>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 bg-white border border-slate-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-semibold text-slate-900">{slot.subject}</h4>
                                                <Badge variant="outline" className="text-xs font-normal bg-slate-50">{slot.time}</Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                                <span className="inline-block w-2 H-2 rounded-full bg-slate-300"></span>
                                                {slot.type}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* 3. Right Sidebar (1/3 width) */}
                <div className="space-y-6">

                    {/* AI Tutor Call to Action */}
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none shadow-lg overflow-hidden relative">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

                        <CardContent className="p-6 relative z-10 flex flex-col items-center text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <BrainCircuit className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Need Help Studying?</h3>
                                <p className="text-indigo-100 text-sm mt-1 mb-4">Your AI Tutor is ready to explain complex topics instantly.</p>
                            </div>
                            <Button
                                onClick={() => setShowAITutor(true)}
                                className="w-full bg-white text-indigo-700 hover:bg-white/90 font-semibold"
                            >
                                <PlayCircle className="h-4 w-4 mr-2" /> Start Chat
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Notice Board */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-base font-bold text-slate-800">Notice Board</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                <h4 className="text-sm font-semibold text-amber-900 mb-1">Science Fair Registration</h4>
                                <p className="text-xs text-amber-700 mb-2">Registration deadline is extended till Friday.</p>
                                <span className="text-[10px] text-amber-600 font-medium">Today, 10:00 AM</span>
                            </div>
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">School Holiday</h4>
                                <p className="text-xs text-slate-600 mb-2">School will remain closed on Monday.</p>
                                <span className="text-[10px] text-slate-500 font-medium">Yesterday</span>
                            </div>
                            <Button variant="link" className="w-full text-xs text-slate-500 h-auto py-1">View all notices</Button>
                        </CardContent>
                    </Card>

                </div>
            </div>

            <AITutorChat open={showAITutor} onOpenChange={setShowAITutor} studentId={studentId} />
        </div>
    );
}
