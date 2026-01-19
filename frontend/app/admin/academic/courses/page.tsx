'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, ArrowLeft, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { academicAPI, Course, AcademicClass } from '@/lib/api';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

export default function CourseManagementPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        subject: '',
        academic_class: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [coursesData, classesData] = await Promise.all([
                academicAPI.getCourses(),
                academicAPI.getClasses()
            ]);
            setCourses(coursesData);
            setClasses(classesData);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!formData.subject || !formData.academic_class) return;
        try {
            setLoading(true);
            await academicAPI.createCourse({
                subject: formData.subject,
                academic_class: formData.academic_class
            });
            setIsDialogOpen(false);
            setFormData({ subject: '', academic_class: '' }); // Reset
            loadData();
        } catch (error) {
            console.error('Failed to create course', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this course?')) return;
        try {
            await academicAPI.deleteCourse(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete course', error);
        }
    }

    const getClassName = (id: string) => {
        const cls = classes.find(c => c.class_id === id);
        return cls ? `Grade ${cls.grade} - ${cls.section}` : 'Unknown Class';
    };

    const filteredCourses = courses.filter(c =>
        c.subject.toLowerCase().includes(filter.toLowerCase()) ||
        getClassName(c.academic_class).toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            {/* Header */}
            <header className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Course Management</h1>
                        <p className="text-slate-500 text-sm">Assign subjects to academic classes.</p>
                    </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Add New Course
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Course</DialogTitle>
                            <DialogDescription>Define a subject for a specific class.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Subject Name</Label>
                                <Input
                                    className="col-span-3"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="e.g. Mathematics, Science"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Class</Label>
                                <Select
                                    value={formData.academic_class}
                                    onValueChange={(v) => setFormData({ ...formData, academic_class: v })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.sort((a, b) => a.grade - b.grade).map(cls => (
                                            <SelectItem key={cls.class_id} value={cls.class_id}>
                                                Grade {cls.grade} - {cls.section}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={loading || !formData.academic_class}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Course
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            {/* Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Active Courses</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search courses or classes..."
                                className="pl-8"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Assigned Class</TableHead>
                                <TableHead>Course ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredCourses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No courses found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCourses.map((c) => (
                                    <TableRow key={c.course_id}>
                                        <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-indigo-500" />
                                            {c.subject}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800">
                                                {getClassName(c.academic_class)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-mono text-xs">{c.course_id.slice(0, 8)}...</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(c.course_id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
