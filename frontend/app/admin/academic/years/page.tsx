'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Plus,
    RefreshCcw,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
    academicAPI,
    AcademicYear,
    AcademicYearRolloverRequest,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RolloverTargetMode = 'create' | 'existing';

type RolloverFormState = {
    source_year: string;
    target_mode: RolloverTargetMode;
    target_year: string;
    target_name: string;
    target_start_date: string;
    target_end_date: string;
    migrate_timetable: boolean;
    migrate_courses: boolean;
    migrate_lessons: boolean;
    migrate_quizzes_exercises: boolean;
    auto_upgrade_students: boolean;
};

const pad2 = (value: number) => String(value).padStart(2, '0');
const formatDateInput = (value: Date) => `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;

function suggestNextYearDraft(source: AcademicYear | null) {
    if (!source) {
        return { name: '', start_date: '', end_date: '' };
    }

    const sourceStart = new Date(source.start_date);
    const sourceEnd = new Date(source.end_date);
    if (Number.isNaN(sourceStart.getTime()) || Number.isNaN(sourceEnd.getTime())) {
        return { name: '', start_date: '', end_date: '' };
    }

    const start = new Date(sourceEnd);
    start.setDate(start.getDate() + 1);
    const durationDays = Math.max(
        1,
        Math.round((sourceEnd.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);

    const rangeMatch = source.name.match(/(\d{4})\D+(\d{4})/);
    const name = rangeMatch
        ? `${Number(rangeMatch[1]) + 1}-${Number(rangeMatch[2]) + 1}`
        : `${start.getFullYear()}-${end.getFullYear()}`;

    return {
        name,
        start_date: formatDateInput(start),
        end_date: formatDateInput(end),
    };
}

export default function AcademicYearsPage() {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [currentYearId, setCurrentYearId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        is_current: false,
    });
    const [submitting, setSubmitting] = useState(false);

    const [isRolloverDialogOpen, setIsRolloverDialogOpen] = useState(false);
    const [rolloverSubmitting, setRolloverSubmitting] = useState(false);
    const [rolloverForm, setRolloverForm] = useState<RolloverFormState>({
        source_year: '',
        target_mode: 'create',
        target_year: '',
        target_name: '',
        target_start_date: '',
        target_end_date: '',
        migrate_timetable: true,
        migrate_courses: true,
        migrate_lessons: true,
        migrate_quizzes_exercises: true,
        auto_upgrade_students: false,
    });

    useEffect(() => {
        loadYears();
    }, []);

    const selectedSourceYear = useMemo(
        () => years.find((year) => String(year.id) === rolloverForm.source_year) || null,
        [rolloverForm.source_year, years],
    );

    async function loadYears() {
        try {
            const data = await academicAPI.getAcademicYears();
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
            is_current: year.is_current,
        });
        setIsEditMode(true);
        setCurrentYearId(year.id);
        setIsDialogOpen(true);
    }

    function openRolloverDialog() {
        const source = years.find((year) => year.is_current) || years[0] || null;
        const draft = suggestNextYearDraft(source);
        setRolloverForm({
            source_year: source ? String(source.id) : '',
            target_mode: 'create',
            target_year: '',
            target_name: draft.name,
            target_start_date: draft.start_date,
            target_end_date: draft.end_date,
            migrate_timetable: true,
            migrate_courses: true,
            migrate_lessons: true,
            migrate_quizzes_exercises: true,
            auto_upgrade_students: false,
        });
        setIsRolloverDialogOpen(true);
    }

    function handleRolloverSourceChange(value: string) {
        const source = years.find((year) => String(year.id) === value) || null;
        const draft = suggestNextYearDraft(source);
        setRolloverForm((prev) => ({
            ...prev,
            source_year: value,
            target_name: prev.target_mode === 'create' ? draft.name : prev.target_name,
            target_start_date: prev.target_mode === 'create' ? draft.start_date : prev.target_start_date,
            target_end_date: prev.target_mode === 'create' ? draft.end_date : prev.target_end_date,
        }));
    }

    async function handleSubmit() {
        if (!formData.name || !formData.start_date || !formData.end_date) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
            toast.error('End date must be after start date');
            return;
        }

        try {
            setSubmitting(true);
            if (isEditMode && currentYearId) {
                await academicAPI.updateAcademicYear(currentYearId, formData);
                toast.success('Academic year updated');
            } else {
                await academicAPI.createAcademicYear(formData);
                toast.success('Academic year created');
            }
            setIsDialogOpen(false);
            await loadYears();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save academic year');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            await academicAPI.deleteAcademicYear(id);
            toast.success('Academic year deleted');
            await loadYears();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete academic year');
        }
    }

    async function handleSetCurrent(year: AcademicYear) {
        if (year.is_current) return;
        try {
            const updatedYears = years.map((item) => ({
                ...item,
                is_current: item.id === year.id,
            }));
            setYears(updatedYears);

            await academicAPI.updateAcademicYear(year.id, { is_current: true });
            toast.success(`${year.name} is now the current academic year`);
            await loadYears();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update current year');
            await loadYears();
        }
    }

    async function handleRolloverSubmit() {
        if (!rolloverForm.source_year) {
            toast.error('Please select source academic year');
            return;
        }

        if (rolloverForm.target_mode === 'existing') {
            if (!rolloverForm.target_year) {
                toast.error('Please select target academic year');
                return;
            }
            if (rolloverForm.target_year === rolloverForm.source_year) {
                toast.error('Source and target years must be different');
                return;
            }
        } else if (
            rolloverForm.target_start_date
            && rolloverForm.target_end_date
            && new Date(rolloverForm.target_start_date) >= new Date(rolloverForm.target_end_date)
        ) {
            toast.error('Target end date must be after target start date');
            return;
        }

        const payload: AcademicYearRolloverRequest = {
            source_year: Number(rolloverForm.source_year),
            options: {
                migrate_timetable: rolloverForm.migrate_timetable,
                migrate_courses: rolloverForm.migrate_courses,
                migrate_lessons: rolloverForm.migrate_lessons,
                migrate_quizzes: rolloverForm.migrate_quizzes_exercises,
                auto_upgrade_students: rolloverForm.auto_upgrade_students,
            },
        };

        if (rolloverForm.target_mode === 'existing') {
            payload.target_year = Number(rolloverForm.target_year);
        } else {
            payload.target = {
                name: rolloverForm.target_name || undefined,
                start_date: rolloverForm.target_start_date || undefined,
                end_date: rolloverForm.target_end_date || undefined,
            };
        }

        try {
            setRolloverSubmitting(true);
            const response = await academicAPI.rolloverAcademicYear(payload);
            const summary = response.summary;
            toast.success(
                `Rollover complete: ${response.target_year} | Subjects ${summary.subjects_migrated}, Lessons ${summary.lessons_migrated}, Quizzes ${summary.assessments_migrated}, Timetable ${summary.timetable_entries_migrated}, Promoted ${summary.students_promoted}`,
            );
            setIsRolloverDialogOpen(false);
            await loadYears();
        } catch (error) {
            console.error('Failed to rollover academic year', error);
            toast.error('Failed to rollover academic year');
        } finally {
            setRolloverSubmitting(false);
        }
    }

    const existingTargetYears = years.filter((year) => String(year.id) !== rolloverForm.source_year);

    return (
        <div className="min-h-screen space-y-6 bg-slate-50 p-6 dark:bg-slate-900">
            <header className="flex items-center justify-between border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Academic Years</h1>
                        <p className="text-sm text-slate-500">Manage school sessions and year transition workflow.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={openRolloverDialog}>
                        <RefreshCcw className="mr-2 h-4 w-4" /> Rollover FY
                    </Button>
                    <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="mr-2 h-4 w-4" /> Add Academic Year
                    </Button>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Academic Sessions</CardTitle>
                    <CardDescription>
                        Define start/end dates and current year. When a current FY expires, the backend auto-selects/creates the next year during active API usage.
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
                                    <TableCell colSpan={5} className="py-8 text-center">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : years.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                        No academic years found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                years.map((year) => (
                                    <TableRow key={year.id} className={year.is_current ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}>
                                        <TableCell>
                                            {year.is_current ? (
                                                <Badge className="bg-green-600 hover:bg-green-700">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Current
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-slate-500">Past/Future</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-lg font-medium">{year.name}</TableCell>
                                        <TableCell>{format(new Date(year.start_date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>{format(new Date(year.end_date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!year.is_current && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(year)} title="Mark as Current">
                                                        <CheckCircle2 className="h-4 w-4 text-slate-400 hover:text-green-600" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(year)}>
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600"
                                                    onClick={() => handleDelete(year.id)}
                                                >
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
                                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(event) => setFormData({ ...formData, start_date: event.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(event) => setFormData({ ...formData, end_date: event.target.value })}
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
                                    onChange={(event) => setFormData({ ...formData, is_current: event.target.checked })}
                                />
                                <Label htmlFor="is_current" className="cursor-pointer font-normal">Set as current academic year</Label>
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

            <Dialog open={isRolloverDialogOpen} onOpenChange={setIsRolloverDialogOpen}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>Academic Year Rollover</DialogTitle>
                        <DialogDescription>
                            Move selected data from one academic year to the next FY and optionally auto-upgrade student classes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-2">
                        <div className="grid gap-2">
                            <Label>Source Year</Label>
                            <Select value={rolloverForm.source_year} onValueChange={handleRolloverSourceChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((year) => (
                                        <SelectItem key={year.id} value={String(year.id)}>
                                            {year.name}{year.is_current ? ' (Current)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Target</Label>
                            <Select
                                value={rolloverForm.target_mode}
                                onValueChange={(value: RolloverTargetMode) =>
                                    setRolloverForm((prev) => ({ ...prev, target_mode: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="create">Create next academic year</SelectItem>
                                    <SelectItem value="existing">Use existing academic year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {rolloverForm.target_mode === 'existing' ? (
                            <div className="grid gap-2">
                                <Label>Target Year</Label>
                                <Select
                                    value={rolloverForm.target_year}
                                    onValueChange={(value) => setRolloverForm((prev) => ({ ...prev, target_year: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {existingTargetYears.map((year) => (
                                            <SelectItem key={year.id} value={String(year.id)}>
                                                {year.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="grid gap-4 rounded-lg border bg-slate-50 p-4">
                                <div className="grid gap-2">
                                    <Label>Target Year Name</Label>
                                    <Input
                                        value={rolloverForm.target_name}
                                        onChange={(event) =>
                                            setRolloverForm((prev) => ({ ...prev, target_name: event.target.value }))
                                        }
                                        placeholder={selectedSourceYear ? suggestNextYearDraft(selectedSourceYear).name : 'e.g. 2026-2027'}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-2">
                                        <Label>Start Date</Label>
                                        <Input
                                            type="date"
                                            value={rolloverForm.target_start_date}
                                            onChange={(event) =>
                                                setRolloverForm((prev) => ({ ...prev, target_start_date: event.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>End Date</Label>
                                        <Input
                                            type="date"
                                            value={rolloverForm.target_end_date}
                                            onChange={(event) =>
                                                setRolloverForm((prev) => ({ ...prev, target_end_date: event.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-3 rounded-lg border p-4">
                            <p className="text-sm font-medium text-slate-900">Data migration options</p>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="rollover_timetable">Timetable</Label>
                                <Switch
                                    id="rollover_timetable"
                                    checked={rolloverForm.migrate_timetable}
                                    onCheckedChange={(checked) =>
                                        setRolloverForm((prev) => ({ ...prev, migrate_timetable: checked }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="rollover_courses">Courses/Subjects</Label>
                                <Switch
                                    id="rollover_courses"
                                    checked={rolloverForm.migrate_courses}
                                    onCheckedChange={(checked) =>
                                        setRolloverForm((prev) => ({ ...prev, migrate_courses: checked }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="rollover_lessons">Lessons/Chapters</Label>
                                <Switch
                                    id="rollover_lessons"
                                    checked={rolloverForm.migrate_lessons}
                                    onCheckedChange={(checked) =>
                                        setRolloverForm((prev) => ({ ...prev, migrate_lessons: checked }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="rollover_quizzes">Exercises/Quizzes</Label>
                                <Switch
                                    id="rollover_quizzes"
                                    checked={rolloverForm.migrate_quizzes_exercises}
                                    onCheckedChange={(checked) =>
                                        setRolloverForm((prev) => ({ ...prev, migrate_quizzes_exercises: checked }))
                                    }
                                />
                            </div>
                            <div className="mt-1 border-t pt-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="rollover_upgrade">Auto-upgrade students to next class</Label>
                                    <Switch
                                        id="rollover_upgrade"
                                        checked={rolloverForm.auto_upgrade_students}
                                        onCheckedChange={(checked) =>
                                            setRolloverForm((prev) => ({ ...prev, auto_upgrade_students: checked }))
                                        }
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    Students in final class remain unchanged and are counted as skipped.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRolloverDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRolloverSubmit} disabled={rolloverSubmitting}>
                            {rolloverSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                            Run Rollover
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
