'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, ArrowUpCircle, AlertCircle, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { saasApi, Tenant } from "@/lib/api/saas";
import { toast } from "sonner";
import Link from 'next/link';
import { CreateSchoolDialog } from "@/components/saas/create-school-dialog";

type TenantSummary = Tenant & {
    plan_name?: string;
    student_count?: number;
    ai_usage?: string;
    billing_cycle?: string;
    subscription_status?: 'active' | 'inactive' | 'suspended' | string;
};

export default function SaasSchoolsPage() {
    const [schools, setSchools] = useState<TenantSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSchools();
    }, []);

    const loadSchools = async () => {
        try {
            const data = await saasApi.getTenants();
            setSchools(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load schools.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">School Subscriptions</h2>
                <CreateSchoolDialog onCreated={loadSchools} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Onboarded Tenants ({schools.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>School Name</TableHead>
                                <TableHead>Domain/Subdomain</TableHead>
                                <TableHead>Current Plan</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead>AI Usage</TableHead>
                                <TableHead>Billing Cycle</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schools.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                                        No schools found. Onboard a school to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                schools.map((school) => (
                                    <TableRow key={school.tenant_id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div className="font-bold">{school.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{school.tenant_id.slice(0, 8)}...</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {school.subdomain}.domain.com
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{school.plan_name}</Badge>
                                        </TableCell>
                                        <TableCell>{school.student_count}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${parseInt(school.ai_usage || '0') > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                        style={{ width: school.ai_usage }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs text-slate-500">{school.ai_usage}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="capitalize">{school.billing_cycle}</TableCell>
                                        <TableCell>
                                            <Badge variant={school.subscription_status === 'active' ? 'default' : 'destructive'} className="capitalize">
                                                {school.subscription_status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem>
                                                        <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade Plan
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Link href={`/saas/schools/${school.tenant_id}`} className="w-full h-full flex items-center">
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">
                                                        <AlertCircle className="mr-2 h-4 w-4" /> Suspend
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
