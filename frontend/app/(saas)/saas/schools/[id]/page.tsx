'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building, Users, CreditCard, Activity, Loader2, RefreshCcw, Search, MoreHorizontal, Eye, EyeOff, Key, ShieldAlert, ShieldCheck, Save, Plus, Download, Upload, Copy } from "lucide-react";
import { coreAPI, getApiBaseUrl, Invoice, saasApi, Subscription, SubscriptionPlan, SubscriptionPlanHistory, Tenant, User } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

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

type NewUserFormState = {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    role: User['role'];
};

const EMPTY_USER_FORM: UserFormState = {
    first_name: '',
    last_name: '',
    email: '',
    role: 'student'
};

const EMPTY_NEW_USER_FORM: NewUserFormState = {
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    role: 'student'
};

const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
    student_ai_chatbot: false,
    student_gamification: false,
    parent_attendance: false,
    parent_fees: false,
    teacher_ai_grading: false,
    teacher_reports: false,
};

function getTenantIdentifier(tenantValue: unknown): string {
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

function belongsToSchool(tenantValue: unknown, school: TenantDetails): boolean {
    const tenantRef = getTenantIdentifier(tenantValue);
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

const numberFmt = new Intl.NumberFormat('en-US');

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
    const [isSavingFeatures, setIsSavingFeatures] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);

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
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(DEFAULT_FEATURE_FLAGS);

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
    const [newUserDialogOpen, setNewUserDialogOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState<NewUserFormState>(EMPTY_NEW_USER_FORM);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
    const [passwordResetValue, setPasswordResetValue] = useState('');
    const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
    const [isResettingUserPassword, setIsResettingUserPassword] = useState(false);
    const [adminSharePassword, setAdminSharePassword] = useState('');
    const [showSharePassword, setShowSharePassword] = useState(false);
    const [isResettingAdminPassword, setIsResettingAdminPassword] = useState(false);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState(false);
    const [planHistory, setPlanHistory] = useState<SubscriptionPlanHistory[]>([]);
    const [planHistoryLoading, setPlanHistoryLoading] = useState(false);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

    const loadUsers = useCallback(async (tenant: TenantDetails) => {
        setUsersLoading(true);
        try {
            const tenantId = String(tenant.id ?? tenant.tenant_id ?? '');
            if (!tenantId) {
                setUsers([]);
                return;
            }
            const tenantUsers = await saasApi.getTenantUsers(tenantId);
            setUsers(Array.isArray(tenantUsers) ? tenantUsers : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tenant users.");
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    }, []);

    const loadInvoices = useCallback(async (tenant: TenantDetails) => {
        setInvoicesLoading(true);
        try {
            const allInvoices = await saasApi.getInvoices();
            const invoiceRows = Array.isArray(allInvoices) ? allInvoices : [];
            const scopedInvoices = invoiceRows
                .filter(inv => belongsToSchool(inv.tenant, tenant))
                .sort((a, b) => new Date(b.issued_date).getTime() - new Date(a.issued_date).getTime());
            setInvoices(scopedInvoices);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tenant invoices.");
            setInvoices([]);
        } finally {
            setInvoicesLoading(false);
        }
    }, []);

    const loadPlanHistory = useCallback(async (tenant: TenantDetails) => {
        setPlanHistoryLoading(true);
        try {
            const tenantId = String(tenant.id ?? tenant.tenant_id ?? '');
            if (!tenantId) {
                setPlanHistory([]);
                return;
            }
            const history = await saasApi.getSubscriptionHistoryByTenant(tenantId);
            setPlanHistory(Array.isArray(history) ? history : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load plan history.");
            setPlanHistory([]);
        } finally {
            setPlanHistoryLoading(false);
        }
    }, []);

    const loadSubscriptionContext = useCallback(async (tenant: TenantDetails) => {
        setSubscriptionLoading(true);
        try {
            const tenantId = String(tenant.id ?? tenant.tenant_id ?? '');
            if (!tenantId) {
                setSubscription(null);
                setAvailablePlans([]);
                setSelectedPlanId('');
                return;
            }

            const [plans, subscriptions] = await Promise.all([
                saasApi.getPlans(),
                saasApi.getSubscriptions(),
            ]);

            const safePlans = Array.isArray(plans) ? plans : [];
            const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
            const matchedSubscription = safeSubscriptions.find((sub) => {
                const subTenantId = String((sub as { tenant?: string | number }).tenant ?? '');
                return subTenantId === tenantId;
            }) || null;

            const currentPlanId = String(matchedSubscription?.plan ?? '');
            const visiblePlans = safePlans.filter((plan) => {
                const planId = String(plan.plan_id || plan.id || '');
                if (!planId) return false;
                if (plan.is_active) return true;
                return currentPlanId !== '' && planId === currentPlanId;
            });

            setAvailablePlans(visiblePlans);
            setSubscription(matchedSubscription);

            if (matchedSubscription) {
                setSelectedPlanId(currentPlanId);
                const cycle = (matchedSubscription.billing_cycle || 'monthly').toLowerCase();
                setSelectedBillingCycle(cycle === 'yearly' ? 'yearly' : 'monthly');
            } else {
                const fallbackPlanId = String(visiblePlans[0]?.plan_id || visiblePlans[0]?.id || '');
                setSelectedPlanId(fallbackPlanId);
                setSelectedBillingCycle('monthly');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load subscription plans.");
            setSubscription(null);
            setAvailablePlans([]);
        } finally {
            setSubscriptionLoading(false);
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
            setFeatureFlags({
                ...DEFAULT_FEATURE_FLAGS,
                ...(tenant.features || {})
            });

            await Promise.all([
                loadUsers(tenant),
                loadInvoices(tenant),
                loadPlanHistory(tenant),
                loadSubscriptionContext(tenant),
            ]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load school details.");
        } finally {
            setIsLoading(false);
        }
    }, [loadUsers, loadInvoices, loadPlanHistory, loadSubscriptionContext]);

    useEffect(() => {
        if (schoolId) {
            loadSchoolAndUsers(schoolId);
        }
    }, [schoolId, loadSchoolAndUsers]);

    const handleRefreshUsers = async () => {
        if (!school) return;
        await loadUsers(school);
    };

    const handleRefreshInvoices = async () => {
        if (!school) return;
        await loadInvoices(school);
    };

    const handleRefreshPlanHistory = async () => {
        if (!school) return;
        await loadPlanHistory(school);
    };

    const handleRefreshSubscriptionContext = async () => {
        if (!school) return;
        await loadSubscriptionContext(school);
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
        const tenantId = String(school?.id ?? school?.tenant_id ?? '');
        if (!tenantId) return;
        setIsSavingUser(true);
        try {
            const updated = await saasApi.updateTenantUser(tenantId, selectedUser.user_id, {
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

    const handleCreateUser = async () => {
        if (!school) return;
        const tenantId = String(school.id ?? school.tenant_id ?? '');
        if (!tenantId) return;
        if (!newUserForm.first_name || !newUserForm.last_name || !newUserForm.email || !newUserForm.password) {
            toast.error("First name, last name, email, and password are required.");
            return;
        }

        setIsCreatingUser(true);
        try {
            await saasApi.createTenantUser(tenantId, {
                first_name: newUserForm.first_name,
                last_name: newUserForm.last_name,
                email: newUserForm.email,
                username: newUserForm.username || newUserForm.email.split('@')[0],
                password: newUserForm.password,
                role: newUserForm.role,
                tenant: tenantId
            });

            toast.success("User created successfully.");
            setNewUserDialogOpen(false);
            setNewUserForm(EMPTY_NEW_USER_FORM);
            await loadUsers(school);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create user.");
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleToggleUserStatus = async (user: User) => {
        const tenantId = String(school?.id ?? school?.tenant_id ?? '');
        if (!tenantId) return;
        setActiveUserActionId(user.user_id);
        try {
            const isCurrentlyActive = user.is_active !== false;
            const updated = await saasApi.updateTenantUser(tenantId, user.user_id, { is_active: !isCurrentlyActive });
            setUsers(prev => prev.map(u => (u.user_id === user.user_id ? { ...u, ...updated, is_active: !isCurrentlyActive } : u)));
            toast.success(`User ${isCurrentlyActive ? 'suspended' : 'activated'} successfully.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update user status.");
        } finally {
            setActiveUserActionId(null);
        }
    };

    const handleResetPasswordDialogChange = (open: boolean) => {
        setPasswordResetDialogOpen(open);
        if (!open) {
            setPasswordResetUser(null);
            setPasswordResetValue('');
        }
    };

    const openResetPasswordDialog = (user: User) => {
        setPasswordResetUser(user);
        setPasswordResetValue('');
        setPasswordResetDialogOpen(true);
    };

    const handleResetPassword = async () => {
        if (!passwordResetUser) return;
        const tenantId = String(school?.id ?? school?.tenant_id ?? '');
        if (!tenantId) return;
        if (passwordResetValue.trim().length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        setIsResettingUserPassword(true);
        try {
            await saasApi.resetTenantUserPassword(tenantId, passwordResetUser.user_id, passwordResetValue.trim());
            toast.success("Password reset successfully.");
            handleResetPasswordDialogChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to reset password.");
        } finally {
            setIsResettingUserPassword(false);
        }
    };

    const generateTemporaryPassword = () => {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
        const length = 14;
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);
        let password = '';
        for (let i = 0; i < length; i += 1) {
            password += alphabet[randomValues[i] % alphabet.length];
        }
        return password;
    };

    const copyText = async (label: string, value: string) => {
        if (!value) {
            toast.error(`No ${label.toLowerCase()} to copy.`);
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied.`);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to copy ${label.toLowerCase()}.`);
        }
    };

    const handleGenerateAdminSharePassword = async () => {
        if (!school) return;
        const tenantId = String(school.id ?? school.tenant_id ?? '');
        if (!tenantId) {
            toast.error("Missing tenant identifier.");
            return;
        }
        if (!primaryAdmin?.user_id) {
            toast.error("No admin user found for this school.");
            return;
        }
        const temporaryPassword = generateTemporaryPassword();
        setIsResettingAdminPassword(true);
        try {
            const result = await saasApi.resetAdminPassword(tenantId, temporaryPassword, {
                adminUserId: primaryAdmin.user_id,
                adminEmail: primaryAdmin.email || undefined,
            });
            setAdminSharePassword(temporaryPassword);
            setShowSharePassword(true);
            toast.success(`Temporary password set for ${result.admin_email || primaryAdmin.email || 'admin user'}.`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate temporary admin password.");
        } finally {
            setIsResettingAdminPassword(false);
        }
    };

    const handleDownloadInvoice = async (invoice: Invoice) => {
        try {
            const apiBase = getApiBaseUrl();
            const url = `${apiBase}/billing/saas/invoices/${invoice.invoice_id}/download/`;
            await toast.promise(
                saasApi.helpers.downloadFile(url, `invoice_${invoice.invoice_id.slice(0, 8)}.pdf`),
                {
                    loading: 'Preparing invoice...',
                    success: 'Invoice downloaded successfully.',
                    error: 'Failed to download invoice.'
                }
            );
        } catch (error) {
            console.error(error);
            toast.error("Failed to download invoice.");
        }
    };

    const handleApplyPlanChange = async () => {
        if (!school) return;
        const tenantId = String(school.id ?? school.tenant_id ?? '');
        if (!tenantId) return;
        if (!selectedPlanId) {
            toast.error("Please select a subscription plan.");
            return;
        }

        setIsUpdatingSubscription(true);
        try {
            const payload = {
                plan: selectedPlanId,
                billing_cycle: selectedBillingCycle,
            };

            if (subscription?.subscription_id) {
                await saasApi.updateSubscription(subscription.subscription_id, payload);
            } else {
                await saasApi.createSubscription({
                    tenant: tenantId,
                    plan: selectedPlanId,
                    billing_cycle: selectedBillingCycle,
                    status: 'active',
                });
            }

            const selectedPlan = availablePlans.find(
                (plan) => String(plan.plan_id || plan.id || '') === selectedPlanId
            );
            setSchool((prev) => prev ? ({
                ...prev,
                plan_name: selectedPlan?.name || prev.plan_name,
                billing_cycle: selectedBillingCycle,
                subscription_status: 'active',
            }) : prev);

            toast.success("Subscription plan updated successfully.");
            await loadSchoolAndUsers(schoolId);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update subscription plan.");
        } finally {
            setIsUpdatingSubscription(false);
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

    const handleSaveFeatures = async () => {
        toast.info("Feature access is strictly controlled by the subscribed plan. Change plan to adjust features.");
    };

    const handleUploadLogo = async () => {
        if (!school || !selectedLogoFile) return;
        setIsUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', selectedLogoFile);
            const targetId = String(school.id ?? schoolId);
            const updated = await coreAPI.uploadTenantLogo(targetId, formData);
            setSchool(prev => (prev ? { ...prev, ...updated } : prev));
            setSelectedLogoFile(null);
            toast.success("School logo updated.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload logo.");
        } finally {
            setIsUploadingLogo(false);
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

    const studentCount = useMemo(
        () => Math.max(users.filter(u => u.role === 'student').length, school?.student_count ?? 0),
        [users, school?.student_count]
    );
    const teacherCount = useMemo(
        () => Math.max(users.filter(u => u.role === 'teacher').length, school?.teacher_count ?? 0),
        [users, school?.teacher_count]
    );
    const adminCount = useMemo(
        () => Math.max(users.filter(u => u.role === 'admin').length, school?.admin_count ?? 0),
        [users, school?.admin_count]
    );
    const totalUsers = useMemo(
        () => Math.max(users.length, school?.total_users ?? 0, studentCount + teacherCount + adminCount),
        [users.length, school?.total_users, studentCount, teacherCount, adminCount]
    );
    const primaryAdmin = useMemo(
        () => users.find((u) => u.role === 'admin') || null,
        [users]
    );

    const aiTokensUsed = school?.ai_tokens_used ?? 0;
    const aiTokenLimit = school?.ai_token_limit ?? 0;
    const aiUsagePercent = useMemo(() => {
        if (typeof school?.ai_usage === 'string' && school.ai_usage.trim().endsWith('%')) {
            const parsed = parseFloat(school.ai_usage.replace('%', '').trim());
            if (!Number.isNaN(parsed)) return parsed;
        }
        if (aiTokenLimit <= 0) return 0;
        return (aiTokensUsed / aiTokenLimit) * 100;
    }, [school?.ai_usage, aiTokenLimit, aiTokensUsed]);

    const storageUsedMb = school?.storage_used_mb
        ?? ((school?.storage_used_bytes ?? 0) / (1024 * 1024));
    const storageLimitGb = school?.storage_limit_gb ?? 0;
    const storageUsagePercent = school?.storage_usage_percent
        ?? (storageLimitGb > 0 ? (storageUsedMb / (storageLimitGb * 1024)) * 100 : 0);
    const tenantIdentifier = String(school?.id ?? school?.tenant_id ?? schoolId);
    const schoolDomain = school?.domain
        || school?.website
        || (school?.subdomain ? `${school.subdomain}` : 'Not configured');
    const schoolCode = (school?.subdomain || school?.schema_name || '').trim();
    const adminLoginEmail = (primaryAdmin?.email || '').trim();

    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
    const failedInvoices = invoices.filter(inv => inv.status === 'failed');
    const paidRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);
    const pendingRevenue = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);

    const nextInvoiceDate = useMemo(() => {
        if (invoices.length === 0) return 'Not available';
        const latest = invoices[0];
        if (latest.due_date) return new Date(latest.due_date).toLocaleDateString();

        const source = new Date(latest.issued_date);
        if (Number.isNaN(source.getTime())) return 'Not available';
        const next = new Date(source);
        if ((school?.billing_cycle || '').toLowerCase().includes('year')) {
            next.setFullYear(next.getFullYear() + 1);
        } else {
            next.setMonth(next.getMonth() + 1);
        }
        return next.toLocaleDateString();
    }, [invoices, school?.billing_cycle]);

    const currentPlan = useMemo(() => {
        if (!subscription?.plan) return null;
        const currentPlanId = String(subscription.plan);
        return availablePlans.find(plan => String(plan.plan_id || plan.id || '') === currentPlanId) || null;
    }, [availablePlans, subscription?.plan]);

    const selectedPlan = useMemo(() => {
        if (!selectedPlanId) return null;
        return availablePlans.find(plan => String(plan.plan_id || plan.id || '') === selectedPlanId) || null;
    }, [availablePlans, selectedPlanId]);

    const planChangeLabel = useMemo(() => {
        if (!currentPlan || !selectedPlan) return 'Apply Plan Change';
        const currentMonthly = Number(currentPlan.price_monthly || 0);
        const nextMonthly = Number(selectedPlan.price_monthly || 0);
        if (nextMonthly > currentMonthly) return 'Upgrade Plan';
        if (nextMonthly < currentMonthly) return 'Downgrade Plan';
        return 'Apply Plan Change';
    }, [currentPlan, selectedPlan]);

    const hasPendingPlanChange = useMemo(() => {
        if (!subscription) return Boolean(selectedPlanId);
        const currentPlanId = String(subscription.plan || '');
        const selectedId = String(selectedPlanId || '');
        const currentCycle = (subscription.billing_cycle || 'monthly').toLowerCase();
        return currentPlanId !== selectedId || currentCycle !== selectedBillingCycle;
    }, [subscription, selectedPlanId, selectedBillingCycle]);

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
                        {schoolDomain} • ID: <span className="font-mono text-xs">{tenantIdentifier}</span>
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
                            {studentCount} Students • {teacherCount} Teachers • {adminCount} Admins
                        </p>
                        <Button variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => setActiveTab('users')}>
                            View user details
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{school.plan_name || 'Trial (Plan Pending)'}</div>
                        <p className="text-xs text-muted-foreground">
                            {(school.billing_cycle || 'monthly')} cycle • {(school.subscription_status || school.status || 'active')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            AI limit: {numberFmt.format(aiTokenLimit)} tokens • Storage limit: {storageLimitGb} GB
                        </p>
                        <Button variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => setActiveTab('billing')}>
                            Open plan details
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{aiUsagePercent.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {numberFmt.format(aiTokensUsed)} / {numberFmt.format(aiTokenLimit)} tokens
                        </p>
                        <div className="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full ${aiUsagePercent >= 90 ? 'bg-red-500' : aiUsagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(aiUsagePercent, 100)}%` }}
                            />
                        </div>
                        <Button variant="link" className="h-auto p-0 mt-2 text-xs" onClick={() => router.push('/saas/ai')}>
                            Open AI analytics
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{storageUsagePercent.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {storageUsedMb.toFixed(2)} MB used of {storageLimitGb} GB
                        </p>
                        <div className="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                            <div
                                className={`h-full ${storageUsagePercent >= 90 ? 'bg-red-500' : storageUsagePercent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                            Calculated from tenant schema size in PostgreSQL.
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
                            <CardTitle>Overview & Activity</CardTitle>
                            <CardDescription>
                                Operational summary for this school tenant.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid gap-4 md:grid-cols-3">
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
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Paid Revenue</div>
                                    <div className="font-semibold">${numberFmt.format(paidRevenue)}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500">Pending Revenue</div>
                                    <div className="font-semibold">${numberFmt.format(pendingRevenue)}</div>
                                </div>
                            </div>

                            <div className="rounded-md border p-4 space-y-4">
                                <div>
                                    <div className="font-medium">School Access Credentials</div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Existing passwords are encrypted and cannot be viewed. Generate a temporary password when you need to share credentials.
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>School Code</Label>
                                        <div className="flex gap-2">
                                            <Input value={schoolCode || 'Not configured'} readOnly />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyText('School code', schoolCode)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Admin Login Email</Label>
                                        <div className="flex gap-2">
                                            <Input value={adminLoginEmail || 'No admin user found'} readOnly />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyText('Admin email', adminLoginEmail)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Temporary Admin Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type={showSharePassword ? 'text' : 'password'}
                                            value={adminSharePassword || 'Generate to view temporary password'}
                                            readOnly
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowSharePassword((prev) => !prev)}
                                            disabled={!adminSharePassword}
                                        >
                                            {showSharePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyText('Temporary password', adminSharePassword)}
                                            disabled={!adminSharePassword}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGenerateAdminSharePassword}
                                        disabled={isResettingAdminPassword || !primaryAdmin?.user_id}
                                    >
                                        {isResettingAdminPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                                        Generate Temporary Password
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => copyText(
                                            'Credentials',
                                            `School Code: ${schoolCode}\nAdmin Email: ${adminLoginEmail}\nTemporary Password: ${adminSharePassword}`
                                        )}
                                        disabled={!schoolCode || !adminLoginEmail || !adminSharePassword}
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Copy Full Credentials
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <div className="border-b px-4 py-3 font-medium">Recent Billing Activity</div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.slice(0, 5).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-6 text-center text-slate-500">
                                                    No invoice activity found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            invoices.slice(0, 5).map(inv => (
                                                <TableRow key={inv.invoice_id}>
                                                    <TableCell className="font-mono text-xs">{inv.invoice_id.slice(0, 8)}</TableCell>
                                                    <TableCell className="capitalize">{inv.status}</TableCell>
                                                    <TableCell>${numberFmt.format(parseFloat(inv.amount || '0'))}</TableCell>
                                                    <TableCell>{new Date(inv.issued_date).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" onClick={() => setActiveTab('users')}>Manage Users</Button>
                                <Button variant="outline" onClick={() => setActiveTab('billing')}>Open Billing</Button>
                                <Button variant="outline" onClick={() => loadSchoolAndUsers(schoolId)} disabled={isLoading}>
                                    <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Details
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
                                <Button
                                    onClick={() => {
                                        setNewUserForm(EMPTY_NEW_USER_FORM);
                                        setNewUserDialogOpen(true);
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add User
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
                                                                <DropdownMenuItem onSelect={() => openResetPasswordDialog(user)}>
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

                            <div className="rounded-md border">
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <div className="font-medium">Plan Change History</div>
                                    <Button variant="outline" size="sm" onClick={handleRefreshPlanHistory} disabled={planHistoryLoading}>
                                        {planHistoryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                        Refresh History
                                    </Button>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Changed At</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {planHistoryLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center">
                                                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : planHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                                                    No plan history found for this school.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            planHistory.map((entry) => (
                                                <TableRow key={entry.history_id}>
                                                    <TableCell>{new Date(entry.changed_at).toLocaleString()}</TableCell>
                                                    <TableCell>{entry.previous_plan_name || 'N/A'}</TableCell>
                                                    <TableCell>{entry.new_plan_name || 'N/A'}</TableCell>
                                                    <TableCell>{entry.reason || '-'}</TableCell>
                                                    <TableCell>{entry.changed_by_name || '-'}</TableCell>
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
                            <CardDescription>Plan usage, invoices, and payment status for this school.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md border p-4 space-y-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h4 className="font-semibold">Upgrade / Downgrade Plan</h4>
                                        <p className="text-sm text-slate-500">
                                            Change the subscription plan and billing cycle for this school.
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleRefreshSubscriptionContext} disabled={subscriptionLoading}>
                                        {subscriptionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                        Refresh Plans
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Subscription Plan</Label>
                                        <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={subscriptionLoading || isUpdatingSubscription}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={subscriptionLoading ? "Loading plans..." : "Select plan"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availablePlans.length === 0 ? (
                                                    <SelectItem value="none" disabled>No active plans available</SelectItem>
                                                ) : (
                                                    availablePlans.map((plan) => {
                                                        const planValue = String(plan.plan_id || plan.id || '');
                                                        return (
                                                            <SelectItem key={planValue} value={planValue}>
                                                                {plan.name} - ${numberFmt.format(Number(plan.price_monthly || 0))}/mo
                                                            </SelectItem>
                                                        );
                                                    })
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Billing Cycle</Label>
                                        <Select value={selectedBillingCycle} onValueChange={(value) => setSelectedBillingCycle(value as 'monthly' | 'yearly')} disabled={subscriptionLoading || isUpdatingSubscription}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="yearly">Yearly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500">
                                    Current: {currentPlan?.name || school.plan_name || 'Trial (Plan Pending)'} • {(subscription?.billing_cycle || school.billing_cycle || 'monthly')}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleApplyPlanChange} disabled={!selectedPlanId || isUpdatingSubscription || !hasPendingPlanChange}>
                                        {isUpdatingSubscription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {planChangeLabel}
                                    </Button>
                                    <Button variant="outline" onClick={handleRefreshPlanHistory} disabled={planHistoryLoading}>
                                        {planHistoryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                        Refresh History
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <span className="font-semibold block">Plan:</span> {school.plan_name || 'Trial (Plan Pending)'}
                                </div>
                                <div>
                                    <span className="font-semibold block">Status:</span> {school.subscription_status || school.status}
                                </div>
                                <div>
                                    <span className="font-semibold block">Billing Cycle:</span> {school.billing_cycle || 'monthly'}
                                </div>
                                <div>
                                    <span className="font-semibold block">Next Invoice:</span> {nextInvoiceDate}
                                </div>
                                <div>
                                    <span className="font-semibold block">AI Usage:</span> {numberFmt.format(aiTokensUsed)} / {numberFmt.format(aiTokenLimit)} tokens
                                </div>
                                <div>
                                    <span className="font-semibold block">Storage Usage:</span> {storageUsedMb.toFixed(2)} MB / {storageLimitGb} GB
                                </div>
                                <div>
                                    <span className="font-semibold block">Paid Revenue:</span> ${numberFmt.format(paidRevenue)}
                                </div>
                                <div>
                                    <span className="font-semibold block">Pending Revenue:</span> ${numberFmt.format(pendingRevenue)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setActiveTab('settings')}>
                                    Edit Billing Settings
                                </Button>
                                <Button variant="outline" onClick={handleRefreshInvoices} disabled={invoicesLoading}>
                                    {invoicesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                    Refresh Invoices
                                </Button>
                                <Button variant={school.status === 'active' ? 'destructive' : 'default'} onClick={handleToggleTenantStatus} disabled={isUpdatingTenantStatus}>
                                    {isUpdatingTenantStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {school.status === 'active' ? 'Suspend Subscription' : 'Reactivate Subscription'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500 text-sm">Paid Invoices</div>
                                    <div className="text-xl font-semibold">{paidInvoices.length}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500 text-sm">Pending Invoices</div>
                                    <div className="text-xl font-semibold">{pendingInvoices.length}</div>
                                </div>
                                <div className="rounded-md border p-4">
                                    <div className="text-slate-500 text-sm">Failed Invoices</div>
                                    <div className="text-xl font-semibold">{failedInvoices.length}</div>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Issued</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoicesLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center">
                                                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : invoices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                                                    No invoices found for this school.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            invoices.map(inv => (
                                                <TableRow key={inv.invoice_id}>
                                                    <TableCell className="font-mono text-xs">{inv.invoice_id.slice(0, 8)}</TableCell>
                                                    <TableCell className="capitalize">{inv.status}</TableCell>
                                                    <TableCell>${numberFmt.format(parseFloat(inv.amount || '0'))}</TableCell>
                                                    <TableCell>{new Date(inv.issued_date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(inv)}>
                                                            <Download className="h-4 w-4" />
                                                        </Button>
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
                                        <SelectTrigger disabled>
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
                            <p className="text-xs text-slate-500">
                                Tenant type and feature access are automatically enforced from the subscribed plan.
                            </p>
                            <div className="flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                                    {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Configuration
                                </Button>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <div>
                                    <h4 className="font-semibold">Feature Flags</h4>
                                    <p className="text-sm text-slate-500">Features are plan-controlled and cannot exceed plan entitlements.</p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {Object.entries(featureFlags).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="text-sm">{key.replace(/_/g, ' ')}</div>
                                            <Switch
                                                checked={value}
                                                disabled
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button variant="outline" onClick={handleSaveFeatures} disabled={isSavingFeatures}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Plan-Controlled
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <div>
                                    <h4 className="font-semibold">Branding</h4>
                                    <p className="text-sm text-slate-500">Upload school logo used across tenant pages.</p>
                                </div>
                                {school.logo ? (
                                    <Image
                                        src={school.logo}
                                        alt="School logo"
                                        width={80}
                                        height={80}
                                        className="h-20 w-20 rounded border object-cover"
                                    />
                                ) : (
                                    <div className="text-sm text-slate-500">No logo uploaded yet.</div>
                                )}
                                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setSelectedLogoFile(e.target.files?.[0] || null)}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleUploadLogo}
                                        disabled={!selectedLogoFile || isUploadingLogo}
                                    >
                                        {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload Logo
                                    </Button>
                                </div>
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

            <Dialog open={newUserDialogOpen} onOpenChange={setNewUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                        <DialogDescription>Add a new user account under this school.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="newFirstName">First Name</Label>
                                <Input
                                    id="newFirstName"
                                    value={newUserForm.first_name}
                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newLastName">Last Name</Label>
                                <Input
                                    id="newLastName"
                                    value={newUserForm.last_name}
                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newEmail">Email</Label>
                            <Input
                                id="newEmail"
                                type="email"
                                value={newUserForm.email}
                                onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="newUsername">Username (Optional)</Label>
                                <Input
                                    id="newUsername"
                                    value={newUserForm.username}
                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newUserForm.password}
                                    onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, role: value as User['role'] }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="teacher">Teacher</SelectItem>
                                    <SelectItem value="parent">Parent</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewUserDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                            {isCreatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Create User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={passwordResetDialogOpen} onOpenChange={handleResetPasswordDialogChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset User Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {passwordResetUser?.first_name || passwordResetUser?.username || passwordResetUser?.email || 'this user'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="resetUserPassword">New Password</Label>
                        <Input
                            id="resetUserPassword"
                            type="password"
                            value={passwordResetValue}
                            onChange={(e) => setPasswordResetValue(e.target.value)}
                            placeholder="Enter at least 6 characters"
                            autoComplete="new-password"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => handleResetPasswordDialogChange(false)}>Cancel</Button>
                        <Button onClick={handleResetPassword} disabled={isResettingUserPassword}>
                            {isResettingUserPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
