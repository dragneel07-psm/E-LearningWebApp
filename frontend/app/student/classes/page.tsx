'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, User, Calendar, TrendingUp } from 'lucide-react';
import { academicAPI, helpers, Subject, Teacher, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';

export default function MyClassesPage() {
    const [courses, setCourses] = useState<(Subject & { teacher_details?: Teacher, academic_class_details?: AcademicClass })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoading(true);
            // helpers.getStudentSubjects() now handles fetching the current student's ID internally if not provided
            const studentCourses = await helpers.getStudentSubjects();

            // For now, we need to fetch teacher/class details manually if they aren't expanded by backend
            // In a production app, the backend serializer should expand these relations
            const [teachers, classes] = await Promise.all([
                academicAPI.getTeachers(),
                academicAPI.getClasses()
            ]);

            const enrichedCourses = studentCourses.map(course => ({
                ...course,
                teacher_details: teachers.find(t => t.assigned_classes?.includes(course.academic_class)),
                academic_class_details: classes.find(c => c.id === course.academic_class)
            }));

            setCourses(enrichedCourses);
        } catch (error) {
            console.error('Error loading courses:', error);
            toast.error("Failed to load classes.");
        } finally {
            setLoading(false);
        }
    };

    // Mock progress data - replace with actual data when backend has detailed progress tracking
    const getProgress = (id: number) => {
        // Deterministic mock based on ID char code
        const sum = id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return sum % 100;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">My Classes</h1>
                <p className="text-slate-600">View all your enrolled courses and track your progress</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Total Courses</p>
                            <p className="text-3xl font-bold text-blue-900 mt-1">{courses.length}</p>
                        </div>
                        <BookOpen className="h-10 w-10 text-blue-600" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Average Progress</p>
                            <p className="text-3xl font-bold text-green-900 mt-1">
                                {courses.length > 0
                                    ? Math.round(courses.reduce((acc, c) => acc + getProgress(c.id), 0) / courses.length)
                                    : 0}%
                            </p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-green-600" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 font-medium">Active This Week</p>
                            <p className="text-3xl font-bold text-purple-900 mt-1">{courses.length}</p>
                        </div>
                        <Calendar className="h-10 w-10 text-purple-600" />
                    </div>
                </Card>
            </div>

            {/* Course Cards */}
            {courses.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 mb-2">No Classes Found</h3>
                    <p className="text-slate-500">You don&apos;t seem to be enrolled in any classes yet.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                        const progress = getProgress(course.id);
                        return (
                            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Course Header */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                                    <div className="flex items-start justify-between mb-3">
                                        <BookOpen className="h-8 w-8 opacity-80" />
                                        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                                            Active
                                        </Badge>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1 line-clamp-1">{course.name}</h3>
                                    <p className="text-indigo-100 text-sm">
                                        Grade {course.academic_class_details?.name || 'N/A'}
                                    </p>
                                </div>

                                {/* Course Body */}
                                <div className="p-6">
                                    {/* Teacher Info */}
                                    <div className="flex items-center gap-3 mb-4 text-slate-600">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Instructor</p>
                                            <span className="text-sm font-medium text-slate-700">
                                                {course.teacher_details
                                                    ? `${course.teacher_details.first_name} ${course.teacher_details.last_name}`
                                                    : 'Assigned Teacher'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-slate-500 font-medium">Course Progress</span>
                                            <span className="font-bold text-indigo-600">{getProgress(course.id)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Mock Schedule */}
                                    <div className="flex items-center gap-2 text-slate-500 text-xs mb-6 bg-slate-50 p-2 rounded">
                                        <Clock className="h-3 w-3" />
                                        <span>Mon, Wed, Fri • 10:00 AM (Mock)</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-9 text-sm">
                                            View Materials
                                        </Button>
                                        <Button variant="outline" className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-9 text-sm">
                                            Assignments
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
