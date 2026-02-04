'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, CheckCircle2, PlayCircle, Lock } from 'lucide-react';
import { academicAPI, Subject, Chapter, Lesson } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function StudentCoursePage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [subjectData, chaptersData] = await Promise.all([
                    academicAPI.getSubject(parseInt(courseId)),
                    academicAPI.getChapters(parseInt(courseId))
                ]);
                setSubject(subjectData);
                setChapters(chaptersData);
            } catch (error) {
                console.error('Failed to load course:', error);
                toast.error('Failed to load course content');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [courseId]);

    const handleStartLesson = (lessonId: number) => {
        router.push(`/student/courses/${courseId}/lessons/${lessonId}`);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!subject) return <div>Course not found</div>;

    const totalLessons = chapters.reduce((acc, c) => acc + (c.lessons?.filter(l => l.is_published).length || 0), 0);
    const completedLessons = chapters.reduce((acc, c) => acc + (c.lessons?.filter(l => l.is_published && l.completed).length || 0), 0);
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-8 text-white shadow-xl">
                <div className="relative z-10">
                    <Badge className="mb-4 bg-white/20 text-white backdrop-blur-md border-none">
                        {subject.code || 'COURSE'}
                    </Badge>
                    <h1 className="mb-2 text-4xl font-black tracking-tight">{subject.name}</h1>
                    <p className="mb-6 max-w-2xl text-indigo-100 opacity-90">{subject.description || 'No description available for this course.'}</p>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-200" />
                            <span className="font-bold">{totalLessons} Lessons</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-indigo-200" />
                            <span className="font-bold">12h 30m Content</span>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-4">
                        {progress < 100 && (
                            <Button
                                className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold border-none"
                                onClick={() => {
                                    const allLessons = chapters.flatMap(c => c.lessons || []).filter(l => l.is_published);
                                    const firstIncomplete = allLessons.find(l => !l.completed);
                                    const targetLesson = firstIncomplete || allLessons[0];
                                    if (targetLesson) handleStartLesson(targetLesson.id);
                                }}
                            >
                                <PlayCircle className="mr-2 h-5 w-5" />
                                {progress > 0 ? "Resume Learning" : "Start Course"}
                            </Button>
                        )}
                        {progress === 100 && (
                            <Button
                                className="bg-white/20 text-white hover:bg-white/30 font-bold border-none"
                                onClick={() => {
                                    const allLessons = chapters.flatMap(c => c.lessons || []).filter(l => l.is_published);
                                    if (allLessons.length > 0) handleStartLesson(allLessons[0].id);
                                }}
                            >
                                <CheckCircle2 className="mr-2 h-5 w-5" /> Review Course
                            </Button>
                        )}
                    </div>

                    <div className="mt-6">
                        <div className="mb-2 flex justify-between text-sm font-bold">
                            <span>Your Progress</span>
                            <span>{progress}% Completed</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
                            <div
                                className="h-full bg-white transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Decorative Background */}
                <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-900/40 blur-3xl" />
            </div>

            {/* Curriculum List */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">Course Content</h2>

                <div className="space-y-4">
                    {chapters.map((chapter, index) => (
                        <Card key={chapter.id} className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">
                                    <span className="text-slate-400 mr-2">#{index + 1}</span>
                                    {chapter.title}
                                </h3>
                                <Badge variant="outline" className="bg-white">
                                    {chapter.lessons?.filter(l => l.is_published).length} Lessons
                                </Badge>
                            </div>
                            <CardContent className="p-0">
                                {chapter.lessons?.filter(l => l.is_published).map((lesson) => (
                                    <div
                                        key={lesson.id}
                                        className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b last:border-0 cursor-pointer"
                                        onClick={() => handleStartLesson(lesson.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                                                {lesson.completed ? (
                                                    <CheckCircle2 className="h-5 w-5" />
                                                ) : (
                                                    <PlayCircle className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                    {lesson.title}
                                                </p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> {lesson.duration_minutes} min
                                                </p>
                                            </div>
                                        </div>

                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            Start Lesson
                                        </Button>
                                    </div>
                                ))}
                                {(!chapter.lessons || chapter.lessons.length === 0) && (
                                    <div className="p-6 text-center text-slate-400 text-sm">
                                        No lessons available in this chapter.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
