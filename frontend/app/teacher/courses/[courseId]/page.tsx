'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Users, FileText, BarChart3,
    ArrowLeft, Eye, Settings, Plus,
    ChevronRight, Clock, CheckCircle2,
    Calendar, TrendingUp
} from 'lucide-react';
import { academicAPI, Subject, Chapter, Lesson } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function TeacherCourseDashboard() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalLessons: 0,
        publishedLessons: 0,
        totalStudents: 0,
        averageCompletion: 0
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [subjectData, chaptersData] = await Promise.all([
                academicAPI.getSubject(parseInt(courseId)),
                academicAPI.getChapters(parseInt(courseId))
            ]);

            setSubject(subjectData);
            setChapters(chaptersData);

            // Calculate stats
            let total = 0;
            let published = 0;
            chaptersData.forEach(c => {
                c.lessons?.forEach(l => {
                    total++;
                    if (l.is_published) published++;
                });
            });

            setStats({
                totalLessons: total,
                publishedLessons: published,
                totalStudents: 24, // Mock for now until endpoint available
                averageCompletion: 68 // Mock for now until endpoint available
            });

        } catch (error) {
            console.error('Failed to load course dashboard data:', error);
            toast.error('Failed to load course details');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Navigation removed - handled by layout.tsx */}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm bg-indigo-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest">Content</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{stats.totalLessons}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">{stats.publishedLessons} Published Lessons</p>
                        <div className="mt-4 flex items-center justify-between">
                            <BookOpen className="h-8 w-8 text-indigo-200" />
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">
                                {chapters.length} Chapters
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest">Enrollment</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{stats.totalStudents}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Active Students</p>
                        <div className="mt-4 flex items-center justify-between">
                            <Users className="h-8 w-8 text-emerald-200" />
                            <div className="flex items-center text-emerald-600 text-xs font-bold">
                                <TrendingUp className="h-3 w-3 mr-1" /> Stable
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-amber-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-amber-600 font-bold uppercase text-[10px] tracking-widest">Performance</CardDescription>
                        <CardTitle className="text-2xl font-black text-slate-900">{stats.averageCompletion}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Average Completion Rate</p>
                        <div className="mt-4 flex items-center justify-between">
                            <BarChart3 className="h-8 w-8 text-amber-200" />
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                                +5% v last week
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-purple-50/50">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-purple-600 font-bold uppercase text-[10px] tracking-widest">Next Milestone</CardDescription>
                        <CardTitle className="text-lg font-black text-slate-900 truncate">Final Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-500">Scheduled for Feb 20, 2026</p>
                        <div className="mt-4 flex items-center justify-between">
                            <Calendar className="h-8 w-8 text-purple-200" />
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">
                                Upcoming
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Recent Activity & Curriculum Summary */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-xl border-slate-100 overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold">Curriculum Overview</CardTitle>
                                    <CardDescription>Structure of your course content</CardDescription>
                                </div>
                                <Link href={`/teacher/courses/${courseId}/lessons`}>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 font-bold">
                                        Edit Full Curriculum <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {chapters.map((chapter, i) => (
                                    <div key={chapter.id} className="p-5 hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black border border-indigo-100">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{chapter.title}</h4>
                                                    <p className="text-sm text-slate-500 line-clamp-1">{chapter.description || 'No description provided'}</p>
                                                    <div className="mt-2 flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                            <FileText className="h-3 w-3" /> {chapter.lessons?.length || 0} Lessons
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                            <Clock className="h-3 w-3" /> {chapter.lessons?.reduce((acc, l) => acc + (l.duration_minutes || 0), 0)} Mins Total
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="border-slate-200 text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                                                {chapter.lessons?.filter(l => l.is_published).length}/{chapter.lessons?.length} Published
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {chapters.length === 0 && (
                                    <div className="p-12 text-center text-slate-400 italic">
                                        No chapters created yet.
                                        <Link href={`/teacher/courses/${courseId}/lessons`} className="text-indigo-600 font-bold ml-1 hover:underline">
                                            Start designing your course.
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 border-t p-4 flex justify-center">
                            <Link href={`/teacher/courses/${courseId}/lessons`}>
                                <Button className="w-48 bg-slate-900 hover:bg-slate-800 rounded-xl h-10">
                                    <Plus className="h-4 w-4 mr-2" /> Add New Chapter
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: Actions & Notifications */}
                <div className="space-y-6">
                    <Card className="shadow-xl bg-slate-900 text-white p-6 rounded-3xl border-none">
                        <h3 className="text-xl font-bold mb-4">Quick Insights</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">AI Recommendation</p>
                                <p className="text-sm leading-relaxed">Students are struggling with <b>Chapter 2 Quiz</b>. Consider adding a review lesson.</p>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                                <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">Student High-flier</p>
                                <p className="text-sm leading-relaxed">5 students have already finished <b>Entire Curriculum</b>. Should you add advanced material?</p>
                            </div>
                        </div>
                        <Button className="w-full mt-6 bg-white text-slate-900 hover:bg-indigo-50 font-black rounded-2xl h-12">
                            View AI Analytics
                        </Button>
                    </Card>

                    <Card className="shadow-lg border-slate-100">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { name: "Aarav Sharma", lesson: "Newton's 1st Law", date: "2 mins ago" },
                                { name: "Priya Patel", lesson: "Universal Gravitation", date: "15 mins ago" },
                                { name: "Rohan Das", lesson: "Inertia Concepts", date: "1 hour ago" }
                            ].map((activity, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                        {activity.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 truncate">{activity.name}</p>
                                        <p className="text-[10px] text-slate-400">Completed: {activity.lesson}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-300 whitespace-nowrap">{activity.date}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

const CardFooter = ({ children, className = "", ...props }: any) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);
