'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Video, Link as LinkIcon, FileUp, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { academicAPI, Lesson, Course } from '@/lib/api/saas';
import { toast } from 'sonner';

export default function StudentCourseLessonsPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [courseData, lessonsData] = await Promise.all([
                academicAPI.getCourse(courseId),
                academicAPI.getLessonsByCourse(courseId)
            ]);
            setCourse(courseData);
            setLessons(lessonsData);
        } catch (error) {
            console.error('Failed to load course data:', error);
            toast.error('Failed to load course data');
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    const loadProgress = useCallback(() => {
        // Load from localStorage for now
        // TODO: Replace with API call when backend progress tracking is implemented
        const saved = localStorage.getItem(`course-progress-${courseId}`);
        if (saved) {
            setCompletedLessons(new Set(JSON.parse(saved)));
        }
    }, [courseId]);

    useEffect(() => {
        loadData();
        loadProgress();
    }, [loadData, loadProgress]);

    const getContentTypeIcon = (type: string) => {
        switch (type) {
            case 'text':
                return <FileText className="h-5 w-5 text-blue-600" />;
            case 'video':
                return <Video className="h-5 w-5 text-red-600" />;
            case 'pdf':
                return <FileUp className="h-5 w-5 text-green-600" />;
            case 'link':
                return <LinkIcon className="h-5 w-5 text-purple-600" />;
            default:
                return <FileText className="h-5 w-5 text-gray-600" />;
        }
    };

    const progressPercentage = lessons.length > 0
        ? (completedLessons.size / lessons.length) * 100
        : 0;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{course?.subject}</h1>
                    <p className="text-muted-foreground">Course Lessons</p>
                </div>
            </div>

            {/* Progress Card */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-lg">Your Progress</h3>
                        <p className="text-sm text-muted-foreground">
                            {completedLessons.size} of {lessons.length} lessons completed
                        </p>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">
                        {Math.round(progressPercentage)}%
                    </div>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </Card>

            {/* Lessons List */}
            {lessons.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-semibold mb-2">No lessons available</h3>
                    <p className="text-muted-foreground">
                        Your teacher hasn&apos;t added any lessons yet
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {lessons.map((lesson, index) => {
                        const isCompleted = completedLessons.has(lesson.lesson_id);

                        return (
                            <Card
                                key={lesson.lesson_id}
                                className={`p-6 hover:shadow-md transition-all cursor-pointer ${isCompleted ? 'bg-green-50 border-green-200' : ''
                                    }`}
                                onClick={() => router.push(`/student/courses/${courseId}/lessons/${lesson.lesson_id}`)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                                        ) : (
                                            <Circle className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border">
                                        {getContentTypeIcon(lesson.content_type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Lesson {index + 1}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold">{lesson.title}</h3>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        {isCompleted ? 'Review' : 'Start'}
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
