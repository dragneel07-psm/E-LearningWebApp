// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    CalendarClock, Loader2, PlusCircle, CheckCircle2, XCircle,
    Clock, Ban, Users,
} from 'lucide-react';
import { academicAPI, studentLeaveAPI, StudentLeave, Student, Parent } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle2 className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
    cancelled: <Ban className="h-3 w-3" />,
};

const LEAVE_TYPES = [
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal' },
    { value: 'family', label: 'Family Emergency' },
    { value: 'event', label: 'Event / Competition' },
    { value: 'other', label: 'Other' },
];

export default function ParentLeavesPage() {
    const [parent, setParent] = useState<Parent | null>(null);
    const [leaves, setLeaves] = useState<StudentLeave[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [selectedChild, setSelectedChild] = useState('');
    const [leaveType, setLeaveType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [docUrl, setDocUrl] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const p = await academicAPI.getMyParent();
            setParent(p);
            // load leaves for all children
            const allLeaves: StudentLeave[] = [];
            for (const child of (p.students ?? [])) {
                const res = await studentLeaveAPI.getLeaves({ student: child.student_id });
                allLeaves.push(...(Array.isArray(res) ? res : []));
            }
            // sort newest first
            allLeaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setLeaves(allLeaves);
        } catch {
            toast.error('Failed to load leave data');
        } finally {
            setLoading(false);
        }
    };

    const openDialog = () => {
        setSelectedChild('');
        setLeaveType('');
        setStartDate('');
        setEndDate('');
        setReason('');
        setDocUrl('');
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedChild || !leaveType || !startDate || !endDate || !reason.trim()) {
            toast.error('Please fill in all required fields.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            toast.error('End date must be on or after start date.');
            return;
        }
        setSubmitting(true);
        try {
            await studentLeaveAPI.applyLeave({
                student: selectedChild,
                leave_type: leaveType,
                start_date: startDate,
                end_date: endDate,
                reason,
                supporting_document_url: docUrl || undefined,
            });
            toast.success('Leave request submitted successfully.');
            setDialogOpen(false);
            loadData();
        } catch {
            toast.error('Failed to submit leave request.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (leaveId: string) => {
        try {
            await studentLeaveAPI.cancelLeave(leaveId);
            toast.success('Leave request cancelled.');
            loadData();
        } catch {
            toast.error('Failed to cancel leave request.');
        }
    };

    const stats = {
        total: leaves.length,
        pending: leaves.filter(l => l.status === 'pending').length,
        approved: leaves.filter(l => l.status === 'approved').length,
        rejected: leaves.filter(l => l.status === 'rejected').length,
    };

    const children: Student[] = parent?.students ?? [];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                        <CalendarClock className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Parent Portal</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Leave Requests</h1>
                    <p className="text-slate-500 font-medium">Apply and track leave requests for your children.</p>
                </div>
                <Button
                    onClick={openDialog}
                    className="gap-2 bg-violet-600 hover:bg-violet-700 font-bold shrink-0"
                    disabled={children.length === 0}
                >
                    <PlusCircle className="h-4 w-4" /> Request Leave
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'bg-violet-50 text-violet-700' },
                    { label: 'Pending', value: stats.pending, color: 'bg-amber-50 text-amber-700' },
                    { label: 'Approved', value: stats.approved, color: 'bg-emerald-50 text-emerald-700' },
                    { label: 'Rejected', value: stats.rejected, color: 'bg-red-50 text-red-700' },
                ].map(s => (
                    <Card key={s.label} className="border-0 shadow-sm">
                        <CardContent className={`p-4 rounded-xl ${s.color}`}>
                            <p className="text-2xl font-black">{s.value}</p>
                            <p className="text-xs font-bold uppercase tracking-wide opacity-70">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Leaves Table */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-violet-500" /> Leave History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {leaves.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No leave requests found.</p>
                            <p className="text-sm mt-1">Click "Request Leave" to submit one.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        {['Child', 'Type', 'Period', 'Days', 'Reason', 'Status', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {leaves.map(leave => (
                                        <tr key={leave.leave_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-800">
                                                {leave.student_name || leave.student}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="capitalize font-semibold text-xs">
                                                    {leave.leave_type.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                                {leave.start_date} → {leave.end_date}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 font-semibold">{leave.total_days}d</td>
                                            <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{leave.reason}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[leave.status]}`}>
                                                    {STATUS_ICON[leave.status]}
                                                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {leave.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7"
                                                        onClick={() => handleCancel(leave.leave_id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Apply Leave Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black text-slate-900">
                            <CalendarClock className="h-5 w-5 text-violet-600" /> Request Leave
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="font-bold">Child <span className="text-red-500">*</span></Label>
                            <Select value={selectedChild} onValueChange={setSelectedChild}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select child" />
                                </SelectTrigger>
                                <SelectContent>
                                    {children.map(c => (
                                        <SelectItem key={c.student_id} value={c.student_id}>
                                            {c.first_name} {c.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="font-bold">Leave Type <span className="text-red-500">*</span></Label>
                            <Select value={leaveType} onValueChange={setLeaveType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEAVE_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="font-bold">Start Date <span className="text-red-500">*</span></Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-bold">End Date <span className="text-red-500">*</span></Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="font-bold">Reason <span className="text-red-500">*</span></Label>
                            <Textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Reason for leave..."
                                rows={3}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-600">Document URL <span className="text-slate-400 font-normal">(optional)</span></Label>
                            <Input
                                value={docUrl}
                                onChange={e => setDocUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-violet-600 hover:bg-violet-700 gap-2 font-bold"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
