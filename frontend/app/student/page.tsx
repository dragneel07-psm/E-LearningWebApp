'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    BookOpen, Trophy, BrainCircuit, Calendar,
    AlertCircle, TrendingUp, ChevronRight, PlayCircle,
    Sparkles, Lightbulb, Megaphone
} from 'lucide-react';
import { academicAPI, aiAPI, usersAPI, helpers, Subject, Timetable, Attendance } from '@/lib/api';
import { AITutorChat } from '@/components/ai-tutor-chat';
import { GamificationWidget } from '@/components/student/GamificationWidget';
import { SmartPathWidget } from '@/components/student/SmartPathWidget';
import { UpcomingExamsWidget } from '@/components/student/UpcomingExamsWidget';

type TimetableSlot = {
    time: string;
    subject: string;
    type: string;
    status: 'completed' | 'ongoing' | 'upcoming';
};

export default function StudentDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string>('');
    const [courses, setCourses] = useState<Subject[]>([]);
    const [showAITutor, setShowAITutor] = useState(false);
    const [recommendations, setRecommendations] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    const [upcomingExamsCount, setUpcomingExamsCount] = useState(0);
    const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);
    const [notices, setNotices] = useState<any[]>([]);
    const [allAssessmentsState, setAllAssessmentsState] = useState<any[]>([]);
    const [attendanceRate, setAttendanceRate] = useState(0);
    const [attendanceTrend, setAttendanceTrend] = useState(0);
    const [todayTimetable, setTodayTimetable] = useState<TimetableSlot[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const getWeekdayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
        return (h * 60) + m;
    };

    const formatClock = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
        const date = new Date();
        date.setHours(h, m, 0, 0);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const buildTodayTimetable = (entries: Timetable[]): TimetableSlot[] => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const weekday = getWeekdayName();

        return entries
            .filter((entry) => String(entry.day_of_week || '').toLowerCase() === weekday)
            .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
            .map((entry) => {
                const start = toMinutes(entry.start_time);
                const end = toMinutes(entry.end_time);
                let status: TimetableSlot['status'] = 'upcoming';
                if (nowMinutes > end) status = 'completed';
                else if (nowMinutes >= start && nowMinutes <= end) status = 'ongoing';

                return {
                    time: `${formatClock(entry.start_time)} - ${formatClock(entry.end_time)}`,
                    subject: entry.subject_name || 'Subject',
                    type: String(entry.room_number || entry.academic_class || 'Class'),
                    status,
                };
            });
    };

    const computeAttendance = (records: Attendance[]) => {
        if (!records.length) return { rate: 0, trend: 0 };

        const presentLike = records.filter((record) => record.status === 'present' || record.status === 'late').length;
        const rate = Math.round((presentLike / records.length) * 100);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);

        const currentMonthRecords = records.filter((record) => {
            const d = new Date(record.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        const prevMonthRecords = records.filter((record) => {
            const d = new Date(record.date);
            return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
        });

        const currentRate = currentMonthRecords.length
            ? (currentMonthRecords.filter((r) => r.status === 'present' || r.status === 'late').length / currentMonthRecords.length) * 100
            : rate;
        const prevRate = prevMonthRecords.length
            ? (prevMonthRecords.filter((r) => r.status === 'present' || r.status === 'late').length / prevMonthRecords.length) * 100
            : currentRate;

        return {
            rate,
            trend: Math.round(currentRate - prevRate),
        };
    };

    const loadData = async () => {
        try {
            setError(null);
            setLoading(true);
            const [student, currentUser] = await Promise.all([
                academicAPI.getMyStudent(),
                usersAPI.getMe().catch(() => null)
            ]);
            setStudentId(student.id);
            setUser(currentUser);

            // 1. Fetch Subjects
            const subjects = await helpers.getStudentSubjects(student.id);
            setCourses(subjects);

            const [allAssessments, mySubmissions, myAttendance, myTimetable] = await Promise.all([
                academicAPI.getAssessments(),
                academicAPI.getSubmissions(),
                academicAPI.getMyAttendance().catch(() => []),
                academicAPI.getMyTimetable().catch(() => []),
            ]);

            // 2. Fetch Assessments for counts
            setAllAssessmentsState(allAssessments);
            const now = new Date();

            const upcomingExams = allAssessments.filter(a =>
                (a.type === 'exam' || a.type === 'quiz') &&
                a.due_date && new Date(a.due_date) > now
            );
            setUpcomingExamsCount(upcomingExams.length);

            // 3. Fetch Submissions to find pending ones
            const submittedIds = new Set(mySubmissions.filter(s => s.status !== 'draft').map(s => s.assessment));
            const pending = allAssessments.filter(a => !submittedIds.has(a.assessment_id));
            setPendingAssignmentsCount(pending.length);

            // 4. Attendance + today's timetable (real-time from APIs)
            const attendanceSummary = computeAttendance(myAttendance);
            setAttendanceRate(attendanceSummary.rate);
            setAttendanceTrend(attendanceSummary.trend);
            setTodayTimetable(buildTodayTimetable(myTimetable));

            // 4. Fetch AI Recommendations
            try {
                const recs = await aiAPI.getRecommendations();
                setRecommendations(recs);
            } catch (recError) {
                console.warn("Could not fetch AI recommendations", recError);
            }

            // 5. Fetch Notices
            try {
                const noticesData = await academicAPI.getNotices();
                setNotices(noticesData.slice(0, 3)); // Only show top 3 on dashboard
            } catch (noticeError) {
                console.warn("Could not fetch notices", noticeError);
            }

        } catch (e: any) {
            console.error(e);
            if (e.status === 404 || e.message?.includes('404') || e.message?.includes('No Student')) {
                setError("Student profile not found. Are you logged in as a student?");
            } else {
                setError("Failed to load dashboard data.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading dashboard...</div>;

    if (error) return (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-red-50 text-red-600 p-4 rounded-full">
                <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Dashboard Error</h3>
            <p className="text-slate-500 max-w-md">{error}</p>
            <Button onClick={() => window.location.href = '/login'} variant="outline">Back to Login</Button>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* 1. Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attendance */}
                <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Attendance</p>
                            <h3 className="text-2xl font-bold text-slate-900">{attendanceRate}%</h3>
                            <p className={`text-xs font-medium flex items-center mt-1 ${attendanceTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <TrendingUp className={`h-3 w-3 mr-1 ${attendanceTrend < 0 ? 'rotate-180' : ''}`} />
                                {attendanceTrend >= 0 ? '+' : ''}{attendanceTrend}% this month
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
                            <h3 className="text-2xl font-bold text-slate-900">{pendingAssignmentsCount}</h3>
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
                            <h3 className="text-2xl font-bold text-slate-900">{upcomingExamsCount}</h3>
                            <p className="text-xs text-blue-600 font-medium mt-1">Quizzes & Exams</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                            <Trophy className="h-6 w-6 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* AI Tutor Quick Access */}
                {user?.tenant_features?.student_ai_chatbot !== false && (
                    <Card
                        className="border-none shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                        onClick={() => setShowAITutor(true)}
                    >
                        <CardContent className="p-5 flex items-center justify-between h-full">
                            <div>
                                <p className="text-sm font-medium opacity-80 mb-1">AI Tutor</p>
                                <h3 className="text-xl font-bold">Ask Anything</h3>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <BrainCircuit className="h-6 w-6 text-white" />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* 1. AI Smart Path - High Visibility */}
            {user?.tenant_features?.student_ai_chatbot !== false && recommendations && recommendations.recommendations.length > 0 && (
                <SmartPathWidget recommendation={recommendations.recommendations[0]} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2. Main Content Area (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Course Progress */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg font-bold text-slate-800">My Learning Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 overflow-x-auto">
                            {courses.slice(0, 3).map((course, idx) => (
                                <div
                                    key={course.id}
                                    className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 cursor-pointer shadow-sm hover:shadow-md"
                                    onClick={() => router.push(`/student/courses/${course.id}/lessons`)}
                                >
                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 
                                        ${idx === 0 ? 'bg-indigo-100 text-indigo-600' :
                                            idx === 1 ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-amber-100 text-amber-600'}`}>
                                        <BookOpen className="h-7 w-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900 truncate">{course.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {course.total_lessons || 0} Lessons
                                                </p>
                                            </div>
                                            <span className="text-sm font-black text-slate-700">{course.progress_percentage || 0}%</span>
                                        </div>
                                        <Progress value={course.progress_percentage || 0} className="h-2.5 bg-slate-100" />
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
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
                                {todayTimetable.length === 0 && (
                                    <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                                        No classes scheduled for today.
                                    </div>
                                )}
                                {todayTimetable.map((slot, idx) => (
                                    <div key={idx} className="flex relative pb-6 last:pb-0">
                                        {/* Timeline Line */}
                                        {idx !== todayTimetable.length - 1 && (
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

                    {/* Upcoming Exams Widget */}
                    <UpcomingExamsWidget assessments={allAssessmentsState} />

                    {/* Achievement & Stats */}
                    {user?.tenant_features?.student_gamification !== false && (
                        <GamificationWidget />
                    )}

                    {/* AI Recommendations */}
                    {user?.tenant_features?.student_ai_chatbot !== false && recommendations && recommendations.recommendations.length > 0 && (
                        <Card className="border-none shadow-md overflow-hidden bg-white border-l-4 border-indigo-500">
                            <CardHeader className="pb-3 flex flex-row items-center gap-2">
                                <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
                                <CardTitle className="text-base font-bold text-slate-800">AI Study Picks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-3">
                                    <Lightbulb className="h-5 w-5 text-indigo-600 shrink-0" />
                                    <p className="text-xs text-indigo-900 leading-relaxed italic">
                                        &quot;{recommendations.learning_style_advice}&quot;
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {recommendations.recommendations.map((rec: any) => (
                                        <div
                                            key={rec.id}
                                            className="group p-3 rounded-xl border border-slate-100 transition-all hover:shadow-sm hover:border-indigo-200 cursor-pointer"
                                            onClick={() => router.push(`/student/courses/${rec.subject_id}/lessons`)}
                                        >
                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">{rec.subject}</p>
                                            <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 line-clamp-1">{rec.title}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1">{rec.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* AI Tutor Call to Action */}
                    {user?.tenant_features?.student_ai_chatbot !== false && (
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
                    )}

                    {/* Notice Board */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-800">Notice Board</CardTitle>
                            <Megaphone className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {notices.length > 0 ? (
                                notices.map((notice, idx) => {
                                    const isNew = (dateString: string) => {
                                        const date = new Date(dateString);
                                        const now = new Date();
                                        const diffTime = Math.abs(now.getTime() - date.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        return diffDays <= 3;
                                    };

                                    return (
                                        <div key={idx} className={`p-3 rounded-lg border ${notice.priority === 'high' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-semibold ${notice.priority === 'high' ? 'text-red-900' : 'text-slate-900'}`}>
                                                    {notice.title}
                                                </h4>
                                                {notice.published_date && isNew(notice.published_date) && (
                                                    <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px] h-5 py-0 px-1.5">NEW</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600 mb-2 line-clamp-2">{notice.content}</p>
                                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                                {notice.published_date ? new Date(notice.published_date).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-4 text-xs text-slate-400">
                                    No active notices.
                                </div>
                            )}
                            <Button variant="link" className="w-full text-xs text-slate-500 h-auto py-1" onClick={() => router.push('/student/notices')}>
                                View all notices
                            </Button>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {user?.tenant_features?.student_ai_chatbot !== false && (
                <AITutorChat open={showAITutor} onOpenChange={setShowAITutor} studentId={studentId} />
            )}
        </div>
    );
}
