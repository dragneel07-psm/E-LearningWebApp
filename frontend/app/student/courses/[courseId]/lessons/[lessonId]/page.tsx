'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft, ArrowRight, CheckCircle2,
    PlayCircle, FileText, Paperclip,
    Download, Link as LinkIcon, ExternalLink
} from 'lucide-react';
import { academicAPI, Lesson, helpers } from '@/lib/api';
import { toast } from 'sonner';

export default function StudentLessonViewPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;
    const lessonId = params.lessonId as string;

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [allLessons, setAllLessons] = useState<Lesson[]>([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadLesson = useCallback(async () => {
        try {
            setLoading(true);
            const [lessonData, lessonsData] = await Promise.all([
                academicAPI.getLesson(parseInt(lessonId)),
                helpers.getLessonsBySubject(courseId)
            ]);
            setLesson(lessonData);
            setAllLessons(lessonsData);

            // Set progress from backend data
            if (lessonData.user_progress) {
                setIsCompleted(lessonData.user_progress.completed);
            }
        } catch (error) {
            console.error('Failed to load lesson:', error);
            toast.error('Failed to load lesson');
        } finally {
            setLoading(false);
        }
    }, [courseId, lessonId]);

    useEffect(() => {
        loadLesson();
    }, [loadLesson]);

    const toggleComplete = async () => {
        const idNum = parseInt(lessonId);
        try {
            const response = await academicAPI.toggleLessonProgress(idNum);
            setIsCompleted(response.completed);
            toast.success(response.completed ? 'Marked as complete!' : 'Marked as incomplete');
        } catch (error) {
            console.error('Failed to toggle progress:', error);
            toast.error('Failed to update progress');
        }
    };

    const getCurrentLessonIndex = () => {
        return allLessons.findIndex(l => l.id === parseInt(lessonId));
    };

    const goToNextLesson = () => {
        const currentIndex = getCurrentLessonIndex();
        if (currentIndex < allLessons.length - 1) {
            const nextLesson = allLessons[currentIndex + 1];
            router.push(`/student/courses/${courseId}/lessons/${nextLesson.id}`);
        }
    };

    const goToPreviousLesson = () => {
        const currentIndex = getCurrentLessonIndex();
        if (currentIndex > 0) {
            const prevLesson = allLessons[currentIndex - 1];
            router.push(`/student/courses/${courseId}/lessons/${prevLesson.id}`);
        }
    };

    const renderVideo = () => {
        if (!lesson?.video_url) return null;

        const youtubeMatch = lesson.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        const vimeoMatch = lesson.video_url.match(/vimeo\.com\/(\d+)/);

        let embedUrl = '';
        if (youtubeMatch) embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        else if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;

        return (
            <div className="mb-8 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {embedUrl ? (
                    <div className="aspect-video">
                        <iframe
                            width="100%"
                            height="100%"
                            src={embedUrl}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <video width="100%" controls className="aspect-video">
                        <source src={lesson.video_url} />
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const currentIndex = getCurrentLessonIndex();
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < allLessons.length - 1;

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
            {/* Header / Navigation Bar */}
            <div className="flex items-center justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md py-4 border-b">
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/student/courses/${courseId}/lessons`)}
                    className="hover:bg-slate-100"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="complete"
                            checked={isCompleted}
                            onCheckedChange={toggleComplete}
                            className="h-5 w-5 rounded-full"
                        />
                        <label
                            htmlFor="complete"
                            className="text-sm font-bold text-slate-600 cursor-pointer select-none"
                        >
                            Complete
                        </label>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={goToPreviousLesson}
                            disabled={!hasPrevious}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-bold px-2 text-slate-500">
                            {currentIndex + 1} / {allLessons.length}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={goToNextLesson}
                            disabled={!hasNext}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Lesson Title Section */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                        Current Lesson
                    </span>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="text-slate-500 text-xs font-medium">{lesson?.duration_minutes} mins</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    {lesson?.title}
                </h1>
            </div>

            {/* Video Content */}
            {renderVideo()}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left side: Content */}
                <div className="lg:col-span-3 space-y-8">
                    {lesson?.content ? (
                        <Card className="border-none shadow-none">
                            <CardContent className="p-0">
                                <div
                                    className="prose prose-slate prose-lg max-w-none 
                                    prose-headings:text-slate-900 prose-headings:font-black
                                    prose-p:text-slate-600 prose-p:leading-relaxed
                                    prose-a:text-indigo-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                                    prose-strong:text-slate-900
                                    prose-img:rounded-2xl prose-img:shadow-lg"
                                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium italic">No text content for this lesson.</p>
                        </div>
                    )}
                </div>

                {/* Right side: Materials & Sidebar */}
                <div className="space-y-6">
                    <div className="sticky top-24 space-y-6">
                        {/* Materials Section */}
                        {lesson?.materials && lesson.materials.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-indigo-600" />
                                    Materials
                                </h3>
                                <div className="space-y-2">
                                    {lesson.materials.map((m) => (
                                        <a
                                            key={m.id}
                                            href={m.file || m.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-600 hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-50 p-2 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                                    {m.material_type === 'pdf' ? (
                                                        <FileText className="h-4 w-4 text-red-500" />
                                                    ) : m.material_type === 'link' ? (
                                                        <ExternalLink className="h-4 w-4 text-indigo-500" />
                                                    ) : (
                                                        <Paperclip className="h-4 w-4 text-slate-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{m.title}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{m.material_type}</p>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Next Action Card */}
                        <Card className="bg-slate-900 text-white p-6 rounded-3xl border-none shadow-2xl">
                            <h4 className="font-bold mb-4">Ready to move on?</h4>
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-2xl font-bold"
                                onClick={isCompleted ? goToNextLesson : toggleComplete}
                            >
                                {isCompleted ? 'Next Lesson' : 'Complete Lesson'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
