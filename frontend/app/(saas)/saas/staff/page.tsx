// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { saasStaffApi, SaasStaffMember } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { UserPlus, Loader2, UserCheck, UserX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<SaasStaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ email: '', first_name: '', last_name: '', password: '' });

    const loadStaff = useCallback(async () => {
        try {
            const data = await saasStaffApi.list();
            setStaff(data);
        } catch {
            toast.error('Failed to load staff members.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    async function handleCreate() {
        if (!form.email || !form.first_name || !form.last_name || !form.password) {
            toast.error('All fields are required.');
            return;
        }
        setSubmitting(true);
        try {
            const created = await saasStaffApi.create(form);
            setStaff(prev => [created, ...prev]);
            setDialogOpen(false);
            setForm({ email: '', first_name: '', last_name: '', password: '' });
            toast.success(`Staff account created for ${created.email}`);
        } catch (err: any) {
            const msg = err?.details?.email?.[0] ?? err?.details?.password?.[0] ?? err?.message ?? 'Failed to create staff.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(member: SaasStaffMember) {
        try {
            const updated = await saasStaffApi.update(member.user_id, { is_active: !member.is_active });
            setStaff(prev => prev.map(s => s.user_id === member.user_id ? updated : s));
            toast.success(`${updated.first_name} ${updated.is_active ? 'activated' : 'deactivated'}.`);
        } catch {
            toast.error('Failed to update staff status.');
        }
    }

    async function handleDeactivate(member: SaasStaffMember) {
        if (!confirm(`Deactivate ${member.email}? They will no longer be able to log in.`)) return;
        try {
            await saasStaffApi.deactivate(member.user_id);
            setStaff(prev => prev.map(s => s.user_id === member.user_id ? { ...s, is_active: false } : s));
            toast.success(`${member.email} deactivated.`);
        } catch {
            toast.error('Failed to deactivate staff.');
        }
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Staff Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Create and manage SaaS portal staff accounts. Only you (Super Admin) can do this.
                    </p>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <UserPlus className="h-4 w-4" />
                    Add Staff
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
            ) : staff.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No staff members yet</p>
                    <p className="text-sm mt-1">Add your first staff member to get started.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map(member => (
                                <TableRow key={member.user_id}>
                                    <TableCell className="font-medium">
                                        {member.first_name} {member.last_name}
                                    </TableCell>
                                    <TableCell className="text-slate-500">{member.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={member.is_active ? 'default' : 'secondary'}
                                            className={member.is_active
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : 'bg-slate-100 text-slate-500'}>
                                            {member.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {new Date(member.date_joined).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {member.last_login ? new Date(member.last_login).toLocaleDateString() : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                title={member.is_active ? 'Deactivate' : 'Activate'}
                                                onClick={() => toggleActive(member)}
                                            >
                                                {member.is_active
                                                    ? <UserX className="h-4 w-4" />
                                                    : <UserCheck className="h-4 w-4" />}
                                            </Button>
                                            {member.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                    title="Deactivate permanently"
                                                    onClick={() => handleDeactivate(member)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Staff Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="first_name">First Name</Label>
                                <Input
                                    id="first_name"
                                    value={form.first_name}
                                    onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                                    placeholder="Jane"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="last_name">Last Name</Label>
                                <Input
                                    id="last_name"
                                    value={form.last_name}
                                    onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                                    placeholder="Smith"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="jane@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                placeholder="Min 8 characters"
                            />
                            <p className="text-xs text-slate-400">
                                Share this password securely with the staff member. They can change it from their profile.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={submitting}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
