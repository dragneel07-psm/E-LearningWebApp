'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Search, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';

import { usersAPI, User } from '@/lib/api';
import { STAFF_ROLE_LABELS, type AdminModule } from '@/lib/rbac';
import type { StaffRole } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STAFF_ROLE_OPTIONS: Array<{ value: StaffRole; label: string }> = [
    { value: '', label: 'No sub-role' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'receptionist', label: 'Receptionist' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'hostel_warden', label: 'Hostel Warden' },
    { value: 'transport_manager', label: 'Transport Manager' },
];

/** Modules visible per staff_role — used only for the preview column */
const ROLE_MODULE_SUMMARY: Record<StaffRole, string> = {
    '': 'Dashboard, Calendar',
    accountant: 'Finance, Fee Collection, Inventory, Reports',
    librarian: 'Library, Inventory',
    receptionist: 'Admissions, Classes, SIS, Timetable, Communication',
    hr_manager: 'HR & Payroll, Teachers, Reports, Communication',
    hostel_warden: 'Hostel, Students (view)',
    transport_manager: 'Transport, Students (view)',
};

function roleBadgeClass(staffRole: StaffRole | undefined): string {
    switch (staffRole) {
        case 'accountant': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'librarian': return 'bg-violet-100 text-violet-700 border-violet-200';
        case 'receptionist': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'hr_manager': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'hostel_warden': return 'bg-teal-100 text-teal-700 border-teal-200';
        case 'transport_manager': return 'bg-orange-100 text-orange-700 border-orange-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
}

export default function StaffAccessPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const all = await usersAPI.getAccounts();
            // Show only staff and admin users (non-student, non-teacher, non-parent)
            setUsers(all.filter((u) => u.role === 'staff' || u.role === 'admin'));
        } catch {
            toast.error('Failed to load staff accounts.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleStaffRoleChange = async (userId: string, staffRole: StaffRole) => {
        setSaving(userId);
        try {
            await usersAPI.updateAccount(userId, { staff_role: staffRole } as Partial<User>);
            setUsers((prev) =>
                prev.map((u) => (u.user_id === userId ? { ...u, staff_role: staffRole } : u))
            );
            toast.success('Staff role updated.');
        } catch {
            toast.error('Failed to update staff role.');
        } finally {
            setSaving(null);
        }
    };

    const filtered = users.filter((u) => {
        const q = search.toLowerCase();
        return (
            u.first_name.toLowerCase().includes(q) ||
            u.last_name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin/settings">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-indigo-600" />
                        Staff Access Control
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Assign roles to staff accounts to control which modules they can access.
                    </p>
                </div>
            </header>

            {/* Role reference card */}
            <Card className="border-indigo-100 bg-indigo-50/40">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-indigo-800">Role Access Reference</CardTitle>
                    <CardDescription className="text-indigo-600 text-xs">
                        School Admin always has full access. Assign a sub-role to staff accounts to restrict access.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {STAFF_ROLE_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                            <div
                                key={opt.value}
                                className="flex flex-col gap-0.5 rounded-lg border border-indigo-100 bg-white p-3"
                            >
                                <Badge className={`w-fit text-[10px] font-bold px-2 py-0.5 ${roleBadgeClass(opt.value)}`}>
                                    {opt.label}
                                </Badge>
                                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                    {ROLE_MODULE_SUMMARY[opt.value]}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-slate-500" />
                        Staff &amp; Admin Accounts
                    </CardTitle>
                    <div className="relative max-w-xs mt-2">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            className="pl-9"
                            placeholder="Search by name or email…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Account Role</TableHead>
                                <TableHead>Staff Sub-Role</TableHead>
                                <TableHead>Module Access</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                                        No staff accounts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((u) => {
                                    const isAdmin = u.role === 'admin';
                                    const staffRole = (u.staff_role ?? '') as StaffRole;

                                    return (
                                        <TableRow key={u.user_id}>
                                            <TableCell className="font-medium">
                                                {u.first_name} {u.last_name}
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                                            <TableCell>
                                                {isAdmin ? (
                                                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                                                        School Admin
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold">
                                                        Staff
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isAdmin ? (
                                                    <span className="text-xs text-slate-400 italic">Full access — no sub-role needed</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={staffRole}
                                                            onValueChange={(val) =>
                                                                handleStaffRoleChange(u.user_id, val as StaffRole)
                                                            }
                                                            disabled={saving === u.user_id}
                                                        >
                                                            <SelectTrigger className="w-44 h-8 text-xs">
                                                                <SelectValue placeholder="Select role…" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {STAFF_ROLE_OPTIONS.map((opt) => (
                                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {saving === u.user_id && (
                                                            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 max-w-xs">
                                                {isAdmin
                                                    ? 'All modules'
                                                    : ROLE_MODULE_SUMMARY[staffRole]}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
