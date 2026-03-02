'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building, Users, CreditCard, Activity, Loader2, RefreshCcw, Search, MoreHorizontal, Eye, Key, ShieldAlert, ShieldCheck, Save } from "lucide-react";
import { saasApi, Tenant, usersAPI, User } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TenantDetails = Tenant & {
    id?: string | number;
    tenant_id?: string;
    schema_name?: string;
    student_count?: number;
    teacher_count?: number;
    plan_name?: string;
    billing_cycle?: string;
    subscription_status?: string;
    ai_usage?: string;
};

type UserFormState = {
    first_name: string;
    last_name: string;
    email: string;
    role: User['role'];
};

const EMPTY_USER_FORM: UserFormState = {
    first_name: '',
    last_name: '',
    email: '',
    role: 'student'
};

function getTenantIdentifier(user: User): string {
    const tenantValue = user.tenant as unknown;
    if (!tenantValue) return '';
    if (typeof tenantValue === 'string' || typeof tenantValue === 'number') {
        return String(tenantValue);
    }
    if (typeof tenantValue === 'object') {
        const maybeTenant = tenantValue as Record<string, unknown>;
        return String(maybeTenant.id ?? maybeTenant.tenant_id ?? '');
    }
    return '';
}

function belongsToSchool(user: User, school: TenantDetails): boolean {
    const tenantRef = getTenantIdentifier(user);
    if (!tenantRef) return false;
    const schoolRefs = [school.id, school.tenant_id].filter(Boolean).map(String);
    return schoolRefs.includes(tenantRef);
}

function formatRole(role: string): string {
    if (role === 'saas_admin') return 'SaaS Admin';
    return role
        .split('_')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function SchoolDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const schoolId = useMemo(() => {
        const raw = params.id;
        if (!raw) return '';
        return Array.isArray(raw) ? raw[0] : String(raw);
    }, [params.id]);

    const [school, setSchool] = useState<TenantDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isUpdatingTenantStatus, setIsUpdatingTenantStatus] = useState(false);

    const [settingsForm, setSettingsForm] = useState({
        name: '',
        subdomain: '',
        contact_email: '',
        contact_phone: '',
        website: '',
        address: '',
        type: 'standard',
        status: 'active'
    });

    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState<UserFormState>(EMPTY_USER_FORM);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [activeUserActionId, setActiveUserActionId] = useState<string | null>(null);

    const loadUsers = useCallback(async (tenant: TenantDetails) => {
        setUsersLoading(true);
        try {
            const allUsers = await usersAPI.getAccounts();
            const scopedUsers = allUsers.filter(user => belongsToSchool(user, tenant));
            setUsers(scopedUsers);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tenant users.");
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    }, []);

    const loadSchoolAndUsers = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const tenant = await saasApi.getTenant(id) as TenantDetails;
            setSchool(tenant);
            setSettingsForm({
                name: tenant.name || '',
                subdomain: tenant.subdomain || '',
                contact_email: tenant.contact_email || '',
                contact_phone: tenant.contact_phone || '',
                website: tenant.website || '',
                address: tenant.address || '',
                type: tenant.type || 'standard',
                status: tenant.status || 'active'
            });
            await loadUsers(tenant);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load school details.");
        } finally {
            setIsLoading(false);
        }
    }, [loadUsers]);

    useEffect(() => {
        if (schoolId) {
            loadSchoolAndUsers(schoolId);
        }
    }, [schoolId, loadSchoolAndUsers]);

    const handleRefreshUsers = async () => {
        if (!school) return;
        await loadUsers(school);
    };

    const handleOpenUserDialog = (user: User) => {
        setSelectedUser(user);
        setUserForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            role: user.role
        });
        setUserDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;
        setIsSavingUser(true);
        try {
            const updated = await usersAPI.updateAccount(selectedUser.user_id, {
                first_name: userForm.first_name,
                last_name: userForm.last_name,
                email: userForm.email,
                role: userForm.role
            });
            setUsers(prev =>
                prev.map(u => (u.user_id === selectedUser.user_id ? { ...u, ...updated } : u))
            );
            toast.success("User details updated.");
            setUserDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update user details.");
        } finally {
            setIsSavingUser(false);
        }
    };

    const handleToggleUserStatus = async (user: User) => {
        setActiveUserActionId(user.user_id);
        try {
            const isCurrentlyActive = user.is_active !== false;
            const updated = await usersAPI.updateAccount(user.user_id, { is_active: !isCurrentlyActive });
            setUsers(prev => prev.map(u => (u.user_id === user.user_id ? { ...u, ...updated, is_active: !isCurrentlyActive } : u)));
            toast.success(`User ${isCurrentlyActive ? 'suspended' : 'activated'} successfully.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update user status.");
        } finally {
            setActiveUserActionId(null);
        }
    };

    const handleResetPassword = async (user: User) => {
        const newPassword = window.prompt(`Set a new password for ${user.first_name || user.username || user.email}`);
        if (!newPassword) return;
        setActiveUserActionId(user.user_id);
        try {
            await usersAPI.resetUserPassword(user.user_id, newPassword);
            toast.success("Password reset successfully.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reset password.");
        } finally {
            setActiveUserActionId(null);
        }
    };

    const handleSaveSettings = async () => {
        if (!school) return;
        setIsSavingSettings(true);
        try {
            const targetId = String(school.id ?? schoolId);
            const updated = await saasApi.updateTenant(targetId, {
                name: settingsForm.name,
                subdomain: settingsForm.subdomain,
                contact_email: settingsForm.contact_email || undefined,
                contact_phone: settingsForm.contact_phone || undefined,
                website: settingsForm.website || undefined,
                address: settingsForm.address || undefined,
                type: settingsForm.type,
                status: settingsForm.status
            });
            setSchool(prev => ({ ...(prev || {}), ...updated }));
            toast.success("Tenant settings saved.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save tenant settings.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleToggleTenantStatus = async () => {
        if (!school) return;
        const isActive = school.status === 'active';
        setIsUpdatingTenantStatus(true);
        try {
            const targetId = String(school.id ?? schoolId);
            const updated = await saasApi.updateTenant(targetId, {
                status: isActive ? 'suspended' : 'active'
            });
            const updatedStatus = updated.status || (isActive ? 'suspended' : 'active');
            setSchool(prev => (prev ? { ...prev, ...updated, status: updatedStatus } : prev));
            setSettingsForm(prev => ({ ...prev, status: updatedStatus }));
            toast.success(`Tenant ${isActive ? 'suspended' : 'activated'}.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update tenant status.");
        } finally {
            setIsUpdatingTenantStatus(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const term = userSearch.trim().toLowerCase();
        return users.filter(user => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
            const matchesSearch = !term
                || fullName.includes(term)
                || (user.email || '').toLowerCase().includes(term)
                || (user.username || '').toLowerCase().includes(term);
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            const isActive = user.is_active !== false;
            const matchesStatus = statusFilter === 'all'
                || (statusFilter === 'active' && isActive)
                || (statusFilter === 'inactive' && !isActive);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, userSearch, roleFilter, statusFilter]);

    const derivedStudentCount = useMemo(
        () => users.filter(u => u.role === 'student').length || (school?.student_count ?? 0),
        [users, school?.student_count]
    );
    const derivedTeacherCount = useMemo(
        () => users.filter(u => u.role === 'teacher').length || (school?.teacher_count ?? 0),
        [users, school?.teacher_count]
    );
    const totalUsers = users.length || (derivedStudentCount + derivedTeacherCount);

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    if (!school) {
        return (
            <div className="p-8 text-center space-y-4">
                <h2 className="text-2xl font-bold">School Not Found</h2>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">{school.name}</h2>
                        <Badge variant={school.status === 'active' ? 'default' : 'secondary'} className="capitalize ml-2">
                            {school.status}
                        </Badge>
                    </div>
                    <p className="text-slate-400 pl-6">
                        {(school.domain || `${school.subdomain}.localhost`)} • ID: <span className="font-mono text-xs">{school.id}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('settings')}>
                        Edit Configuration
                    </Button>
                    <Button variant={school.status === 'active' ? 'destructive' : 'default'} onClick={handleToggleTenantStatus} disabled={isUpdatingTenantStatus}>
                        {isUpdatingTenantStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {school.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            {derivedStudentCount} Students • {derivedTeacherCount} Teachers
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{school.plan_name}</div>
                        <p className="text-xs text-muted-foreground">
                            {school.billing_cycle} Cycle • {school.subscription_status}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{school.ai_usage}</div>
                        <p className="text-xs text-muted-foreground">
                            of allocated quota
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">45%</div>
                        <p className="text-xs text-muted-foreground">
                            120GB used of 500GB
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="billing">Billing & Plan</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>
                                Latest state across this tenant.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Tenant Type</div>
                                    <div className="font-semibold capitalize">{school.type || 'standard'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Subscription Status</div>
                                    <div className="font-semibold capitalize">{school.subscription_status || school.status || 'active'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Contact Email</div>
                                    <div className="font-semibold">{school.contact_email || 'Not configured'}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Contact Phone</div>
                                    <div className="font-semibold">{school.contact_phone || 'Not configured'}</div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => loadSchoolAndUsers(schoolId)} disabled={isLoading}>
                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                    Refresh Details
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>Manage users for this school tenant.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, username, or email"
                                        className="pl-9"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-full lg:w-[180px]">
                                        <SelectValue placeholder="Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="parent">Parent</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="saas_admin">SaaS Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full lg:w-[160px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={handleRefreshUsers} disabled={usersLoading}>
                                    {usersLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Refresh
                                </Button>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Menu</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usersLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">
                                                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">
                                                    No users found for current filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <TableRow key={user.user_id}>
                                                    <TableCell className="font-medium">
                                                        {(user.first_name || user.last_name)
                                                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                                            : user.username}
                                                    </TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{formatRole(user.role)}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {user.is_active === false ? (
                                                            <Badge variant="secondary">Inactive</Badge>
                                                        ) : (
                                                            <Badge>Active</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" disabled={activeUserActionId === user.user_id}>
                                                                    {activeUserActionId === user.user_id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => handleOpenUserDialog(user)}>
                                                                    <Eye className="mr-2 h-4 w-4" /> View / Edit Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleResetPassword(user)}>
                                                                    <Key className="mr-2 h-4 w-4" /> Reset Password
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleToggleUserStatus(user)}>
                                                                    {user.is_active === false ? (
                                                                        <>
                                                                            <ShieldCheck className="mr-2 h-4 w-4" /> Activate User
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ShieldAlert className="mr-2 h-4 w-4" /> Suspend User
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <span className="font-semibold block">Plan:</span> {school.plan_name}
                                </div>
                                <div>
                                    <span className="font-semibold block">Status:</span> {school.subscription_status}
                                </div>
                                <div>
                                    <span className="font-semibold block">Billing Cycle:</span> {school.billing_cycle}
                                </div>
                                <div>
                                    <span className="font-semibold block">Next Invoice:</span> Not available
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setActiveTab('settings')}>
                                    Edit Billing Settings
                                </Button>
                                <Button variant={school.status === 'active' ? 'destructive' : 'default'} onClick={handleToggleTenantStatus} disabled={isUpdatingTenantStatus}>
                                    {isUpdatingTenantStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {school.status === 'active' ? 'Suspend Subscription' : 'Reactivate Subscription'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tenant Configuration</CardTitle>
                            <CardDescription>Update tenant identity, contact details, and status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">School Name</Label>
                                    <Input
                                        id="name"
                                        value={settingsForm.name}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subdomain">Subdomain</Label>
                                    <Input
                                        id="subdomain"
                                        value={settingsForm.subdomain}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, subdomain: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactEmail">Contact Email</Label>
                                    <Input
                                        id="contactEmail"
                                        value={settingsForm.contact_email}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_email: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Contact Phone</Label>
                                    <Input
                                        id="contactPhone"
                                        value={settingsForm.contact_phone}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input
                                        id="website"
                                        value={settingsForm.website}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, website: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={settingsForm.status} onValueChange={(value) => setSettingsForm(prev => ({ ...prev, status: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={settingsForm.type} onValueChange={(value) => setSettingsForm(prev => ({ ...prev, type: value }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="premium">Premium</SelectItem>
                                            <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    value={settingsForm.address}
                                    onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Configuration
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                        <DialogDescription>Update user information and role.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={userForm.first_name}
                                    onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={userForm.last_name}
                                    onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={userForm.email}
                                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={userForm.role} onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value as User['role'] }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="parent">Parent</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="saas_admin">SaaS Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveUser} disabled={isSavingUser}>
                            {isSavingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
