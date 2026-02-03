'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, GripVertical, Loader2 } from 'lucide-react';
import { academicAPI, Chapter, Lesson } from '@/lib/api';
import { toast } from 'sonner';
import LessonEditor from '@/components/course/lesson-editor';

export default function CurriculumEditorPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

    // Initial load
    useEffect(() => {
        loadChapters();
    }, [courseId]);

    const loadChapters = async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getChapters(parseInt(courseId));
            setChapters(data);
        } catch (error) {
            console.error('Failed to load chapters:', error);
            toast.error('Failed to load curriculum');
        } finally {
            setLoading(false);
        }
    };

    const handleLessonSelect = async (lesson: Lesson) => {
        try {
            // Fetch fresh lesson details (including materials)
            // Note: The list view might define materials, but getLesson ensures full detail
            const fullLesson = await academicAPI.getLesson(lesson.id);
            setSelectedLesson(fullLesson);
        } catch (error) {
            toast.error("Failed to load lesson details");
        }
    };

    const handleLessonSave = async (updated: Lesson) => {
        try {
            await academicAPI.updateLesson(updated.id, updated);
            toast.success('Lesson saved successfully');

            // Reload chapters to refresh the sidebar titles/order if changed
            loadChapters();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save lesson');
            throw error; // Re-throw for child component to handle loading state
        }
    };

    const handleChapterCreate = async () => {
        const title = prompt("Enter chapter title:");
        if (!title) return;

        try {
            await academicAPI.createChapter({
                subject: parseInt(courseId),
                title,
                order: chapters.length + 1
            });
            toast.success("Chapter created");
            loadChapters();
        } catch (e) {
            toast.error("Failed to create chapter");
        }
    };

    const handleLessonCreate = async (chapterId: number) => {
        const title = prompt("Enter lesson title:");
        if (!title) return;

        try {
            const chap = chapters.find(c => c.id === chapterId);
            const order = (chap?.lessons?.length || 0) + 1;

            const newLesson = await academicAPI.createLesson({
                chapter: chapterId,
                title,
                order,
                content: '',
                duration_minutes: 30,
                is_published: false
            });

            toast.success("Lesson created");
            await loadChapters();
            // Select the new lesson
            handleLessonSelect(newLesson);
        } catch (e) {
            toast.error("Failed to create lesson");
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
            {/* Header */}
            <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <h1 className="text-lg font-bold text-slate-900">Curriculum Editor</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => router.push(`/student/courses/${courseId}`)}>
                        Preview Course
                    </Button>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {/* Sidebar: Chapters & Lessons List */}
                <aside className="w-80 overflow-y-auto border-r bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Course Structure</h2>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleChapterCreate}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {chapters.map((chapter, cIndex) => (
                            <div key={chapter.id} className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                    <span className="font-bold text-slate-700">
                                        {cIndex + 1}. {chapter.title}
                                    </span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400" onClick={() => handleLessonCreate(chapter.id)}>
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                                <div className="ml-4 space-y-1 border-l-2 border-slate-100 pl-4">
                                    {chapter.lessons?.map((lesson, lIndex) => (
                                        <div
                                            key={lesson.id}
                                            onClick={() => handleLessonSelect(lesson)}
                                            className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${selectedLesson?.id === lesson.id
                                                    ? 'bg-indigo-50 font-medium text-indigo-700'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <GripVertical className="h-3 w-3 text-slate-300" />
                                            <span className="truncate">{lesson.title}</span>
                                        </div>
                                    ))}
                                    {(!chapter.lessons || chapter.lessons.length === 0) && (
                                        <p className="text-xs italic text-slate-400">No lessons yet</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main Content: Lesson Editor */}
                <section className="flex-1 overflow-y-auto p-8">
                    {selectedLesson ? (
                        <LessonEditor
                            key={selectedLesson.id} // Force remount on lesson switch
                            lesson={selectedLesson}
                            chapterTitle={chapters.find(c => c.id === selectedLesson.chapter)?.title}
                            onSave={handleLessonSave}
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                            <div className="mb-4 rounded-full bg-slate-100 p-4">
                                <Plus className="h-8 w-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Select a lesson to edit</h3>
                            <p className="max-w-xs text-sm">Choose a lesson from the sidebar or create a new one to start adding content.</p>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
