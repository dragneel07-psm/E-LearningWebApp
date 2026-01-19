'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { academicAPI, Lesson } from '@/lib/api/saas';
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
                academicAPI.getLesson(lessonId),
                academicAPI.getLessonsByCourse(courseId)
            ]);
            setLesson(lessonData);
            setAllLessons(lessonsData);
        } catch (error) {
            console.error('Failed to load lesson:', error);
            toast.error('Failed to load lesson');
        } finally {
            setLoading(false);
        }
    }, [courseId, lessonId]);

    const loadProgress = useCallback(() => {
        const saved = localStorage.getItem(`course-progress-${courseId}`);
        if (saved) {
            const completed = new Set(JSON.parse(saved));
            setIsCompleted(completed.has(lessonId));
        }
    }, [courseId, lessonId]);

    useEffect(() => {
        loadLesson();
        loadProgress();
    }, [loadLesson, loadProgress]);

    const toggleComplete = () => {
        const saved = localStorage.getItem(`course-progress-${courseId}`);
        const completed = saved ? new Set(JSON.parse(saved)) : new Set();

        if (isCompleted) {
            completed.delete(lessonId);
        } else {
            completed.add(lessonId);
        }

        localStorage.setItem(`course-progress-${courseId}`, JSON.stringify([...completed]));
        setIsCompleted(!isCompleted);
        toast.success(isCompleted ? 'Marked as incomplete' : 'Marked as complete!');
    };

    const getCurrentLessonIndex = () => {
        return allLessons.findIndex(l => l.lesson_id === lessonId);
    };

    const goToNextLesson = () => {
        const currentIndex = getCurrentLessonIndex();
        if (currentIndex < allLessons.length - 1) {
            const nextLesson = allLessons[currentIndex + 1];
            router.push(`/student/courses/${courseId}/lessons/${nextLesson.lesson_id}`);
        }
    };

    const goToPreviousLesson = () => {
        const currentIndex = getCurrentLessonIndex();
        if (currentIndex > 0) {
            const prevLesson = allLessons[currentIndex - 1];
            router.push(`/student/courses/${courseId}/lessons/${prevLesson.lesson_id}`);
        }
    };

    const renderContent = () => {
        if (!lesson) return null;

        switch (lesson.content_type) {
            case 'text':
                return (
                    <div
                        className="prose max-w-none p-6"
                        dangerouslySetInnerHTML={{ __html: lesson.content }}
                    />
                );

            case 'video':
                const youtubeMatch = lesson.content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                const vimeoMatch = lesson.content.match(/vimeo\.com\/(\d+)/);

                if (youtubeMatch) {
                    return (
                        <div className="aspect-video">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="rounded-lg"
                            />
                        </div>
                    );
                } else if (vimeoMatch) {
                    return (
                        <div className="aspect-video">
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                className="rounded-lg"
                            />
                        </div>
                    );
                } else {
                    return (
                        <video width="100%" controls className="rounded-lg">
                            <source src={lesson.content} />
                            Your browser does not support the video tag.
                        </video>
                    );
                }

            case 'pdf':
                return (
                    <iframe
                        src={lesson.content}
                        width="100%"
                        height="800"
                        className="border rounded-lg"
                        title="PDF Document"
                    />
                );

            case 'link':
                return (
                    <Card className="p-8 text-center">
                        <h3 className="text-lg font-semibold mb-4">External Resource</h3>
                        <p className="text-muted-foreground mb-6">
                            This lesson links to an external resource
                        </p>
                        <Button asChild>
                            <a
                                href={lesson.content}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open Resource
                            </a>
                        </Button>
                    </Card>
                );
        }
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
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => router.push(`/student/courses/${courseId}/lessons`)}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Lessons
                </Button>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="complete"
                        checked={isCompleted}
                        onCheckedChange={toggleComplete}
                    />
                    <label
                        htmlFor="complete"
                        className="text-sm font-medium cursor-pointer select-none"
                    >
                        Mark as complete
                    </label>
                    {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
            </div>

            {/* Lesson Content */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                    <div className="text-sm opacity-90 mb-2">
                        Lesson {currentIndex + 1} of {allLessons.length}
                    </div>
                    <h1 className="text-3xl font-bold">{lesson?.title}</h1>
                </div>
                <div className="p-6">
                    {renderContent()}
                </div>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between items-center">
                <Button
                    variant="outline"
                    onClick={goToPreviousLesson}
                    disabled={!hasPrevious}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous Lesson
                </Button>
                <Button
                    onClick={goToNextLesson}
                    disabled={!hasNext}
                >
                    Next Lesson
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
