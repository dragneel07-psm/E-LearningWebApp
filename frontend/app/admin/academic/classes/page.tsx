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
import { ArrowLeft, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { academicAPI, AcademicClass } from '@/lib/api';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

export default function ClassManagementPage() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        grade: '10',
        section: 'A'
    });

    const [subjects, setSubjects] = useState<string[]>(['']);

    useEffect(() => {
        loadClasses();
    }, []);

    async function loadClasses() {
        try {
            const data = await academicAPI.getClasses();
            // Sort by grade then section
            const sorted = data.sort((a, b) => {
                if (a.grade === b.grade) return a.section.localeCompare(b.section);
                return a.grade - b.grade;
            });
            setClasses(sorted);
        } catch (error) {
            console.error('Failed to load classes', error);
        } finally {
            setLoading(false);
        }
    }

    const addSubjectField = () => setSubjects([...subjects, '']);
    const updateSubject = (index: number, value: string) => {
        const newSubjects = [...subjects];
        newSubjects[index] = value;
        setSubjects(newSubjects);
    };
    const removeSubject = (index: number) => {
        const newSubjects = subjects.filter((_, i) => i !== index);
        setSubjects(newSubjects);
    };

    async function handleCreate() {
        try {
            setLoading(true);
            // 1. Create Class
            const newClass = await academicAPI.createClass({
                grade: parseInt(formData.grade),
                section: formData.section.toUpperCase(),
            });

            // 2. Create Subjects (Courses) for this class
            const validSubjects = subjects.filter(s => s.trim() !== '');
            if (validSubjects.length > 0 && newClass.class_id) {
                await Promise.all(validSubjects.map(subject =>
                    academicAPI.createCourse({
                        academic_class: newClass.class_id,
                        subject: subject.trim()
                        // teacher: null initially
                    })
                ));
            }

            setIsDialogOpen(false);
            setSubjects(['']); // Reset
            loadClasses();
        } catch (error) {
            console.error('Failed to create class', error);
            // In a real app, show toast error
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This will not delete students but will unlink them.')) return;
        try {
            await academicAPI.deleteClass(id);
            loadClasses();
        } catch (error) {
            console.error('Failed to delete class', error);
        }
    }

    const filteredClasses = classes.filter(c =>
        `Grade ${c.grade} ${c.section}`.toLowerCase().includes(filter.toLowerCase())
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Class Management</h1>
                        <p className="text-slate-500 text-sm">Define your school&apos;s structural hierarchy.</p>
                    </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="mr-2 h-4 w-4" /> Add New Class
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Academic Class</DialogTitle>
                            <DialogDescription>Create a new grade, section, and default subjects.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Grade</Label>
                                <Select
                                    value={formData.grade}
                                    onValueChange={(v) => setFormData({ ...formData, grade: v })}
                                >
                                    <SelectTrigger className="w-full col-span-3">
                                        <SelectValue placeholder="Select Grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                                            <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Section</Label>
                                <Input
                                    className="col-span-3"
                                    value={formData.section}
                                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                    placeholder="e.g. A, B, Blue"
                                />
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <Label className="mb-2 block font-semibold">Subjects (Courses)</Label>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {subjects.map((subject, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={subject}
                                                onChange={(e) => updateSubject(index, e.target.value)}
                                                placeholder="Subject Name (e.g. Mathematics)"
                                            />
                                            {subjects.length > 1 && (
                                                <Button variant="ghost" size="icon" onClick={() => removeSubject(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full border-dashed"
                                    onClick={addSubjectField}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Subject
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Create Class & Subjects
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            {/* Content */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Active Classes</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search classes..."
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
                                <TableHead>Grade Level</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Class ID</TableHead>
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
                            ) : filteredClasses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No classes found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClasses.map((cls) => (
                                    <TableRow key={cls.class_id}>
                                        <TableCell className="font-medium">Grade {cls.grade}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Section {cls.section}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-500 font-mono text-xs">{cls.class_id.slice(0, 8)}...</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(cls.class_id)}>
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
