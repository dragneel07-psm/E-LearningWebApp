'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Search, Loader2, Calendar as CalendarIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { academicAPI, AcademicYear } from '@/lib/api';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AcademicYearsPage() {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);

    // Create/Edit State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentYearId, setCurrentYearId] = useState<number | null>(null); // For edit
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        is_current: false
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadYears();
    }, []);

    async function loadYears() {
        try {
            const data = await academicAPI.getAcademicYears();
            // Sort by start_date descending
            const sorted = [...data].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
            setYears(sorted);
        } catch (error) {
            console.error('Failed to load academic years', error);
            toast.error('Failed to load academic years');
        } finally {
            setLoading(false);
        }
    }

    function openCreateDialog() {
        setFormData({ name: '', start_date: '', end_date: '', is_current: false });
        setIsEditMode(false);
        setCurrentYearId(null);
        setIsDialogOpen(true);
    }

    function openEditDialog(year: AcademicYear) {
        setFormData({
            name: year.name,
            start_date: year.start_date,
            end_date: year.end_date,
            is_current: year.is_current
        });
        setIsEditMode(true);
        setCurrentYearId(year.id);
        setIsDialogOpen(true);
    }

    async function handleSubmit() {
        if (!formData.name || !formData.start_date || !formData.end_date) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            toast.error("End date must be after start date");
            return;
        }

        try {
            setSubmitting(true);
            if (isEditMode && currentYearId) {
                await academicAPI.updateAcademicYear(currentYearId, formData);
                toast.success("Academic year updated");
            } else {
                await academicAPI.createAcademicYear(formData);
                toast.success("Academic year created");
            }
            setIsDialogOpen(false);
            await loadYears();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save academic year");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await academicAPI.deleteAcademicYear(id);
            toast.success("Academic year deleted");
            loadYears();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete academic year");
        }
    }

    async function handleSetCurrent(year: AcademicYear) {
        if (year.is_current) return; // Already current

        try {
            // Optimistic update
            const updatedYears = years.map(y => ({
                ...y,
                is_current: y.id === year.id
            }));
            setYears(updatedYears);

            await academicAPI.updateAcademicYear(year.id, { is_current: true });
            toast.success(`${year.name} is now the current academic year`);
            loadYears(); // Refresh to ensure backend state consistency
        } catch (err) {
            console.error(err);
            toast.error("Failed to update current year");
            loadYears(); // Revert on error
        }
    }

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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Years</h1>
                        <p className="text-slate-500 text-sm">Manage school sessions and terms.</p>
                    </div>
                </div>

                <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Add Academic Year
                </Button>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Academic Sessions</CardTitle>
                    <CardDescription>
                        Define the start and end dates for your academic years. Only one year can be active at a time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : years.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No academic years found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                years.map((year) => (
                                    <TableRow key={year.id} className={year.is_current ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}>
                                        <TableCell>
                                            {year.is_current ? (
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Current
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">Past/Future</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-lg">{year.name}</TableCell>
                                        <TableCell>{format(new Date(year.start_date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>{format(new Date(year.end_date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 text-right">
                                                {!year.is_current && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(year)} title="Mark as Current">
                                                        <CheckCircle2 className="h-4 w-4 text-slate-400 hover:text-green-600" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(year)}>
                                                    Edit
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(year.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? 'Edit Academic Year' : 'New Academic Year'}</DialogTitle>
                        <DialogDescription>
                            Define the name and duration of the academic session.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Session Name</Label>
                            <Input
                                placeholder="e.g. 2024-2025"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_current"
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    checked={formData.is_current}
                                    onChange={e => setFormData({ ...formData, is_current: e.target.checked })}
                                />
                                <Label htmlFor="is_current" className="font-normal cursor-pointer">Set as current academic year</Label>
                            </div>
                        </div>
                        {formData.is_current && (
                            <div className="rounded-md bg-yellow-50 p-3">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">Attention</h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p>Marking this as current will automatically unset any other current academic year.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isEditMode ? 'Update Session' : 'Create Session'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
