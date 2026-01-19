'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building, Users, CreditCard, Activity, Loader2 } from "lucide-react";
import { saasApi, Tenant } from "@/lib/api/saas";
import { toast } from "sonner";

type TenantDetails = Tenant & {
    student_count?: number;
    teacher_count?: number;
    plan_name?: string;
    billing_cycle?: string;
    subscription_status?: string;
    ai_usage?: string;
};

export default function SchoolDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [school, setSchool] = useState<TenantDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            loadSchool(params.id as string);
        }
    }, [params.id]);

    const loadSchool = async (id: string) => {
        try {
            const data = await saasApi.getTenant(id);
            setSchool(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load school details.");
        } finally {
            setIsLoading(false);
        }
    };

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
                    <p className="text-slate-500 pl-6">
                        {school.subdomain}.domain.com • ID: <span className="font-mono text-xs">{school.tenant_id}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Edit Configuration</Button>
                    <Button variant="destructive">Suspend Tenant</Button>
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
                        <div className="text-2xl font-bold">{(school.student_count ?? 0) + (school.teacher_count ?? 0)}</div>
                        <p className="text-xs text-muted-foreground">
                            {school.student_count ?? 0} Students • {school.teacher_count ?? 0} Teachers
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

            <Tabs defaultValue="overview" className="space-y-4">
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
                                Latest actions performed within this tenant.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-sm text-slate-500">No recent activity logs available.</div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>Manage users for this school.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-500">User list component coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
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
                                    <span className="font-semibold block">Next Invoice:</span> Oct 24, 2026
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
