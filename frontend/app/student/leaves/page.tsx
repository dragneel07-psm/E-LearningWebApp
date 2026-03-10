'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    CalendarClock,
    Loader2,
    PlusCircle,
    Clock,
    CheckCircle2,
    XCircle,
    Ban,
    CalendarDays,
    User,
    MessageSquare,
} from 'lucide-react';
import { studentLeaveAPI, academicAPI, StudentLeave } from '@/lib/api';
import { toast } from 'sonner';

type LeaveType = StudentLeave['leave_type'];

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'family', label: 'Family Leave' },
    { value: 'event', label: 'Event / Activity' },
    { value: 'other', label: 'Other' },
];

function leaveTypeBadgeClass(type: LeaveType) {
    const map: Record<LeaveType, string> = {
        sick: 'bg-red-100 text-red-700 border-red-200',
        personal: 'bg-blue-100 text-blue-700 border-blue-200',
        family: 'bg-purple-100 text-purple-700 border-purple-200',
        event: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        other: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return map[type] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

function statusBadgeClass(status: StudentLeave['status']) {
    const map: Record<StudentLeave['status'], string> = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        approved: 'bg-green-100 text-green-700 border-green-200',
        rejected: 'bg-red-100 text-red-700 border-red-200',
        cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
    };
    return map[status] ?? 'bg-slate-100 text-slate-500 border-slate-200';
}

function statusIcon(status: StudentLeave['status']) {
    if (status === 'approved') return <CheckCircle2 className="h-3.5 w-3.5" />;
    if (status === 'rejected') return <XCircle className="h-3.5 w-3.5" />;
    if (status === 'cancelled') return <Ban className="h-3.5 w-3.5" />;
    return <Clock className="h-3.5 w-3.5" />;
}

interface ApplyForm {
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason: string;
    supporting_document_url: string;
}

const EMPTY_FORM: ApplyForm = {
    leave_type: 'sick',
    start_date: '',
    end_date: '',
    reason: '',
    supporting_document_url: '',
};

export default function StudentLeavesPage() {
    const [leaves, setLeaves] = useState<StudentLeave[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentId, setStudentId] = useState<string>('');

    const [applyDialogOpen, setApplyDialogOpen] = useState(false);
    const [form, setForm] = useState<ApplyForm>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const student = await academicAPI.getMyStudent();
            setStudentId(student.id);
            const data = await studentLeaveAPI.getLeaves();
            setLeaves(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load leave data');
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!form.start_date || !form.end_date || !form.reason.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (new Date(form.end_date) < new Date(form.start_date)) {
            toast.error('End date must be on or after start date');
            return;
        }
        if (!studentId) {
            toast.error('Student profile not loaded');
            return;
        }
        setSubmitting(true);
        try {
            await studentLeaveAPI.applyLeave({
                student: studentId,
                leave_type: form.leave_type,
                start_date: form.start_date,
                end_date: form.end_date,
                reason: form.reason.trim(),
                ...(form.supporting_document_url.trim()
                    ? { supporting_document_url: form.supporting_document_url.trim() }
                    : {}),
            });
            toast.success('Leave application submitted successfully');
            setApplyDialogOpen(false);
            setForm(EMPTY_FORM);
            loadData();
        } catch {
            toast.error('Failed to submit leave application');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (leaveId: string) => {
        setCancellingId(leaveId);
        try {
            await studentLeaveAPI.cancelLeave(leaveId);
            toast.success('Leave request cancelled');
            loadData();
        } catch {
            toast.error('Failed to cancel leave request');
        } finally {
            setCancellingId(null);
        }
    };

    // Stats
    const totalLeaves = leaves.length;
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
    const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarClock className="h-8 w-8 text-teal-600" />
                        My Leaves
                    </h1>
                    <p className="text-muted-foreground mt-1">Apply for leave and track your applications</p>
                </div>
                <Button
                    onClick={() => { setForm(EMPTY_FORM); setApplyDialogOpen(true); }}
                    className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-md"
                >
                    <PlusCircle className="h-4 w-4" />
                    Apply for Leave
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-teal-600 text-white">
                    <CardContent className="p-5">
                        <p className="text-teal-100 text-sm font-medium">Total Applied</p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-3xl font-bold">{totalLeaves}</span>
                            <CalendarDays className="h-7 w-7 opacity-40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-amber-500 text-white">
                    <CardContent className="p-5">
                        <p className="text-amber-50 text-sm font-medium">Pending</p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-3xl font-bold">{pendingLeaves}</span>
                            <Clock className="h-7 w-7 opacity-40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-green-600 text-white">
                    <CardContent className="p-5">
                        <p className="text-green-50 text-sm font-medium">Approved</p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-3xl font-bold">{approvedLeaves}</span>
                            <CheckCircle2 className="h-7 w-7 opacity-40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-red-500 text-white">
                    <CardContent className="p-5">
                        <p className="text-red-50 text-sm font-medium">Rejected</p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-3xl font-bold">{rejectedLeaves}</span>
                            <XCircle className="h-7 w-7 opacity-40" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Leave History */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-lg">Leave History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Date Range</th>
                                    <th className="px-6 py-4">Days</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Reviewed By</th>
                                    <th className="px-6 py-4">Remarks</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {leaves.map(leave => (
                                    <tr key={leave.leave_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${leaveTypeBadgeClass(leave.leave_type)}`}>
                                                {leave.leave_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {new Date(leave.start_date).toLocaleDateString()} &rarr; {new Date(leave.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                            {leave.total_days}
                                        </td>
                                        <td className="px-6 py-4 max-w-[180px]">
                                            <p className="text-sm text-slate-600 truncate" title={leave.reason}>
                                                {leave.reason}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${statusBadgeClass(leave.status)}`}>
                                                {statusIcon(leave.status)}
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {leave.reviewed_by_name ? (
                                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                                    {leave.reviewed_by_name}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 max-w-[160px]">
                                            {leave.review_remarks ? (
                                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                                    <p className="truncate" title={leave.review_remarks}>{leave.review_remarks}</p>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {leave.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1"
                                                    onClick={() => handleCancel(leave.leave_id)}
                                                    disabled={cancellingId === leave.leave_id}
                                                >
                                                    {cancellingId === leave.leave_id
                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                        : <Ban className="h-3 w-3" />}
                                                    Cancel
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {leaves.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                                <CalendarClock className="h-10 w-10 opacity-40" />
                                                <p className="font-medium">No leave applications yet</p>
                                                <p className="text-sm">Click &quot;Apply for Leave&quot; to submit your first request.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Apply for Leave Dialog */}
            <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
                <DialogContent className="sm:max-w-[480px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <CalendarClock className="h-6 w-6 text-teal-600" />
                            Apply for Leave
                        </DialogTitle>
                        <DialogDescription>
                            Fill in the details below to submit your leave application.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {/* Leave Type */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">
                                Leave Type <span className="text-red-500">*</span>
                            </Label>
                            <select
                                value={form.leave_type}
                                onChange={e => setForm(f => ({ ...f, leave_type: e.target.value as LeaveType }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
                            >
                                {LEAVE_TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-700">
                                    Start Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="date"
                                    value={form.start_date}
                                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                    className="text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-slate-700">
                                    End Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="date"
                                    value={form.end_date}
                                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                    className="text-sm"
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">
                                Reason <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                placeholder="Briefly describe the reason for your leave..."
                                value={form.reason}
                                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                rows={3}
                                className="resize-none text-sm"
                            />
                        </div>

                        {/* Document URL */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700">Document URL (optional)</Label>
                            <Input
                                type="url"
                                placeholder="https://..."
                                value={form.supporting_document_url}
                                onChange={e => setForm(f => ({ ...f, supporting_document_url: e.target.value }))}
                                className="text-sm"
                            />
                            <p className="text-xs text-slate-400">Link to a supporting document (medical certificate, etc.)</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleApply}
                            disabled={submitting}
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-bold px-6 shadow-md"
                        >
                            {submitting
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <PlusCircle className="h-4 w-4" />}
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
