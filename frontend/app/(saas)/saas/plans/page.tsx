'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, MoreVertical, Edit, Trash2 } from "lucide-react";
import Link from 'next/link';
import { saasApi, SubscriptionPlan } from '@/lib/api/saas';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


type PlanFeatureFlags = {
    has_ai_tutor?: boolean;
    has_analytics?: boolean;
};

type Plan = SubscriptionPlan & PlanFeatureFlags;

export default function SaasPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const data = await saasApi.getPlans();
            setPlans(data);
        } catch (error) {
            console.error("Failed to load plans", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this plan?")) {
            try {
                await saasApi.deletePlan(id);
                loadPlans(); // Reload list
            } catch (error) {
                console.error("Failed to delete plan", error);
            }
        }
    };

    if (loading) return <div className="p-8">Loading plans...</div>;

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Subscription Plans</h2>
                    <p className="text-slate-500">Manage pricing tiers and feature limits for tenants.</p>
                </div>
                <Link href="/saas/plans/create">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Plan
                    </Button>
                </Link>
            </div>

            {plans.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No plans found. Create one to get started.</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <Card key={plan.plan_id} className="relative flex flex-col">
                            <div className="absolute top-4 right-4">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem>
                                            <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(plan.plan_id)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CardHeader>
                                <div className="flex justify-between items-start pr-8">
                                    <div>
                                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                                        <CardDescription>{plan.description || "No description"}</CardDescription>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-baseline text-3xl font-bold">
                                    ${plan.price_monthly}
                                    <span className="ml-1 text-sm font-medium text-slate-500">/mo</span>
                                </div>
                                <p className="text-xs text-slate-400">or ${plan.price_yearly}/year</p>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                                        {plan.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1 border-b">
                                        <span>Students</span>
                                        <span className="font-semibold">{plan.student_limit}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span>Teachers</span>
                                        <span className="font-semibold">{plan.teacher_limit}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span>AI Tokens</span>
                                        <span className="font-semibold">{plan.ai_token_limit}</span>
                                    </div>
                                </div>
                                <ul className="space-y-2 text-sm mt-4">
                                    {plan.has_ai_tutor && (
                                        <li className="flex items-center text-slate-600 dark:text-slate-300">
                                            <Check className="h-4 w-4 text-green-500 mr-2" /> AI Tutor
                                        </li>
                                    )}
                                    {plan.has_analytics && (
                                        <li className="flex items-center text-slate-600 dark:text-slate-300">
                                            <Check className="h-4 w-4 text-green-500 mr-2" /> Analytics
                                        </li>
                                    )}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full">View Details</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
