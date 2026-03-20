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
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    MessageSquareWarning, PlusCircle, Loader2,
    CheckCircle2, Clock, AlertCircle, Ban,
} from 'lucide-react';
import { complaintAPI, Complaint } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_BADGE: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-500',
};

const PRIORITY_BADGE: Record<string, string> = {
    low: 'bg-slate-100 text-slate-500',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
};

const CATEGORIES = [
    { value: 'academic', label: 'Academic' },
    { value: 'facility', label: 'Facility' },
    { value: 'staff', label: 'Staff Conduct' },
    { value: 'billing', label: 'Billing' },
    { value: 'bullying', label: 'Bullying' },
    { value: 'safety', label: 'Safety' },
    { value: 'other', label: 'Other' },
];

export default function StudentComplaintsPage() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [anonymous, setAnonymous] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const data = await complaintAPI.getComplaints();
            setComplaints(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Failed to load complaints.');
        } finally {
            setLoading(false);
        }
    };

    const openDialog = () => {
        setCategory(''); setTitle(''); setDescription('');
        setPriority('medium'); setAnonymous(false);
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!category || !title.trim() || !description.trim()) {
            toast.error('Please fill in all required fields.');
            return;
        }
        setSubmitting(true);
        try {
            await complaintAPI.submitComplaint({ category, title, description, priority, anonymous });
            toast.success('Complaint submitted. We will review it shortly.');
            setDialogOpen(false);
            loadComplaints();
        } catch {
            toast.error('Failed to submit complaint.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
                        <MessageSquareWarning className="h-4 w-4" />
                        <span className="text-[10px] uppercase tracking-[0.2em]">Student Portal</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Complaints</h1>
                    <p className="text-slate-500 font-medium">Report issues and track their resolution.</p>
                </div>
                <Button onClick={openDialog} className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold shrink-0">
                    <PlusCircle className="h-4 w-4" /> Report Issue
                </Button>
            </div>

            {/* List */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                        <MessageSquareWarning className="h-4 w-4 text-indigo-500" /> Submitted Complaints
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                        </div>
                    ) : complaints.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No complaints submitted yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {complaints.map(c => (
                                <div key={c.complaint_id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-wrap items-start gap-2 mb-2">
                                        <span className="font-bold text-slate-900 flex-1">{c.title}</span>
                                        <Badge className={`text-xs font-bold ${PRIORITY_BADGE[c.priority]}`}>
                                            {c.priority.charAt(0).toUpperCase() + c.priority.slice(1)}
                                        </Badge>
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[c.status]}`}>
                                            {c.status === 'open' && <AlertCircle className="h-3 w-3" />}
                                            {c.status === 'in_progress' && <Clock className="h-3 w-3" />}
                                            {c.status === 'resolved' && <CheckCircle2 className="h-3 w-3" />}
                                            {c.status === 'closed' && <Ban className="h-3 w-3" />}
                                            {c.status.replace('_', ' ').charAt(0).toUpperCase() + c.status.replace('_', ' ').slice(1)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
                                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                                        <Badge variant="outline" className="capitalize text-xs">{c.category}</Badge>
                                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                        {c.resolution_note && (
                                            <span className="text-emerald-600 font-semibold">Resolution: {c.resolution_note}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black text-slate-900">
                            <MessageSquareWarning className="h-5 w-5 text-indigo-600" /> Report an Issue
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="font-bold">Category <span className="text-red-500">*</span></Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-bold">Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold">Title <span className="text-red-500">*</span></Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief title..." />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold">Description <span className="text-red-500">*</span></Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-sm font-bold text-slate-700">Submit Anonymously</p>
                                <p className="text-xs text-slate-400">Your name will be hidden from staff</p>
                            </div>
                            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                            {submitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
