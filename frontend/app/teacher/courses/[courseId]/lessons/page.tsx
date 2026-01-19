'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, FileText, Video, Link as LinkIcon, FileUp, ArrowLeft } from 'lucide-react';
import { academicAPI, Lesson, Course } from '@/lib/api/saas';
import { LessonEditor, LessonData } from '@/components/lesson-editor';
import { toast } from 'sonner';

export default function TeacherCourseLessonsPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

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

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreateLesson = () => {
        setSelectedLesson(null);
        setEditorOpen(true);
    };

    const handleEditLesson = (lesson: Lesson) => {
        setSelectedLesson(lesson);
        setEditorOpen(true);
    };

    const handleSaveLesson = async (data: LessonData) => {
        try {
            if (data.lesson_id) {
                await academicAPI.updateLesson(data.lesson_id, data);
                toast.success('Lesson updated successfully');
            } else {
                await academicAPI.createLesson(data);
                toast.success('Lesson created successfully');
            }
            loadData();
        } catch (error) {
            console.error('Failed to save lesson:', error);
            throw error;
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm('Are you sure you want to delete this lesson?')) return;

        try {
            await academicAPI.deleteLesson(lessonId);
            toast.success('Lesson deleted successfully');
            loadData();
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            toast.error('Failed to delete lesson');
        }
    };

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

    const getContentTypeLabel = (type: string) => {
        switch (type) {
            case 'text':
                return 'Text Content';
            case 'video':
                return 'Video';
            case 'pdf':
                return 'PDF Document';
            case 'link':
                return 'External Link';
            default:
                return type;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Course Lessons</h1>
                        <p className="text-muted-foreground">
                            {course?.subject} - Manage lesson content
                        </p>
                    </div>
                </div>
                <Button onClick={handleCreateLesson} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Lesson
                </Button>
            </div>

            {/* Lessons List */}
            {lessons.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first lesson to get started
                    </p>
                    <Button onClick={handleCreateLesson}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Lesson
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {lessons.map((lesson, index) => (
                        <Card key={lesson.lesson_id} className="p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 bg-slate-50 rounded-lg border">
                                        {getContentTypeIcon(lesson.content_type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Lesson {index + 1}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                {getContentTypeLabel(lesson.content_type)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{lesson.title}</h3>
                                        {lesson.content_type === 'text' && (
                                            <div
                                                className="text-sm text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{
                                                    __html: lesson.content.substring(0, 200) + '...'
                                                }}
                                            />
                                        )}
                                        {lesson.content_type === 'video' && (
                                            <p className="text-sm text-muted-foreground">
                                                Video: {lesson.content.substring(0, 50)}...
                                            </p>
                                        )}
                                        {lesson.content_type === 'pdf' && (
                                            <p className="text-sm text-muted-foreground">
                                                PDF Document
                                            </p>
                                        )}
                                        {lesson.content_type === 'link' && (
                                            <a
                                                href={lesson.content}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                {lesson.content}
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditLesson(lesson)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteLesson(lesson.lesson_id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Lesson Editor Dialog */}
            <LessonEditor
                open={editorOpen}
                onOpenChange={setEditorOpen}
                lesson={selectedLesson}
                courseId={courseId}
                onSave={handleSaveLesson}
            />
        </div>
    );
}
