'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { academicAPI, helpers, Subject } from '@/lib/api';
import { toast } from 'sonner';
import {
    BookOpen, Loader2, PlayCircle, CheckCircle2,
    ChevronRight, GraduationCap, Clock, User
} from 'lucide-react';

export default function StudentCoursesPage() {
    const [courses, setCourses] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const student = await academicAPI.getMyStudent();
                const subjects = await helpers.getStudentSubjects(student.id);
                setCourses(Array.isArray(subjects) ? subjects : []);
            } catch {
                toast.error('Failed to load courses');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Student Portal</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Courses</h1>
                <p className="text-slate-500 font-medium">{courses.length} subject{courses.length !== 1 ? 's' : ''} this term.</p>
            </div>

            {courses.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-20 text-center">
                        <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">No courses found. Check back after enrollment.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => {
                        const progress = course.progress_percentage ?? 0;
                        const totalLessons = course.total_lessons ?? 0;
                        const completedLessons = course.completed_lessons ?? 0;
                        const isComplete = progress >= 100;

                        return (
                            <Card key={course.id} className="border-slate-200 hover:shadow-lg transition-all group overflow-hidden">
                                {/* Colour accent bar */}
                                <div className={`h-1.5 w-full ${isComplete ? 'bg-emerald-500' : progress > 0 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                <CardContent className="p-5 space-y-4">
                                    {/* Subject code + name */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            {course.code && (
                                                <Badge className="mb-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black tracking-widest uppercase">
                                                    {course.code}
                                                </Badge>
                                            )}
                                            <h3 className="font-black text-slate-900 text-lg leading-tight truncate">
                                                {course.name}
                                            </h3>
                                        </div>
                                        {isComplete && (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-1" />
                                        )}
                                    </div>

                                    {/* Description */}
                                    {course.description && (
                                        <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>
                                    )}

                                    {/* Meta */}
                                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                        {course.teacher_name && (
                                            <span className="flex items-center gap-1">
                                                <User className="h-3.5 w-3.5" /> {course.teacher_name}
                                            </span>
                                        )}
                                        {totalLessons > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" /> {totalLessons} Lessons
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-bold text-slate-500">
                                            <span>{completedLessons}/{totalLessons} completed</span>
                                            <span className={isComplete ? 'text-emerald-600' : progress > 0 ? 'text-indigo-600' : 'text-slate-400'}>
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
                                    </div>

                                    {/* CTA */}
                                    <Link href={`/student/courses/${course.id}`}>
                                        <Button className={`w-full h-9 text-xs font-bold rounded-xl gap-2 ${
                                            isComplete
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-indigo-600 hover:bg-indigo-700'
                                        }`}>
                                            {isComplete ? (
                                                <><GraduationCap className="h-3.5 w-3.5" /> Review Course</>
                                            ) : progress > 0 ? (
                                                <><PlayCircle className="h-3.5 w-3.5" /> Continue Learning</>
                                            ) : (
                                                <><PlayCircle className="h-3.5 w-3.5" /> Start Course</>
                                            )}
                                            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
