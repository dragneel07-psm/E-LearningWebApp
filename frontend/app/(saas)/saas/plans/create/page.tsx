'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, EyeOff, Loader2 } from "lucide-react";
import Link from 'next/link';
import { saasApi } from '@/lib/api/saas';
import { toast } from "sonner";

export default function CreatePlanPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Initial State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_monthly: '',
        price_yearly: '',
        currency: 'USD',
        student_limit: '',
        teacher_limit: '',
        ai_token_limit: '',
        storage_limit_gb: '',
        has_ai_tutor: false,
        has_ai_eval: false,
        has_parent_portal: false,
        has_analytics: false,
        has_career_guidance: false,
        is_active: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSwitchChange = (id: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [id]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Convert types
        const payload = {
            ...formData,
            price_monthly: parseFloat(formData.price_monthly) || 0,
            price_yearly: parseFloat(formData.price_yearly) || 0,
            student_limit: parseInt(formData.student_limit) || 0,
            teacher_limit: parseInt(formData.teacher_limit) || 0,
            ai_token_limit: parseInt(formData.ai_token_limit) || 0,
            storage_limit_gb: parseFloat(formData.storage_limit_gb) || 0,
        };

        try {
            await saasApi.createPlan(payload);
            toast.success("Subscription plan created successfully.");
            router.push('/saas/plans');
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Failed to create plan.";
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center space-x-4">
                <Link href="/saas/plans">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Create Subscription Plan</h2>
                    <p className="text-slate-500">Define a new pricing tier and feature set.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-8">
                {/* PLAN DETAILS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Plan Details</CardTitle>
                        <CardDescription>Basic information and pricing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Plan Name</Label>
                            <Input id="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Enterprise Plus" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={formData.description} onChange={handleChange} placeholder="Brief description of who this plan is for..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price_monthly">Monthly Price ($)</Label>
                                <Input id="price_monthly" type="number" step="0.01" required value={formData.price_monthly} onChange={handleChange} placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price_yearly">Yearly Price ($)</Label>
                                <Input id="price_yearly" type="number" step="0.01" required value={formData.price_yearly} onChange={handleChange} placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input id="currency" value={formData.currency} disabled />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* LIMITS & FEATURES */}
                <Card>
                    <CardHeader>
                        <CardTitle>Limits & Features</CardTitle>
                        <CardDescription>Set usage caps and enable specific modules.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="student_limit">Maximum Students</Label>
                                <Input id="student_limit" type="number" required value={formData.student_limit} onChange={handleChange} placeholder="e.g. 500" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="teacher_limit">Maximum Teachers</Label>
                                <Input id="teacher_limit" type="number" required value={formData.teacher_limit} onChange={handleChange} placeholder="e.g. 20" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ai_token_limit">AI Tokens per Month</Label>
                                <Input id="ai_token_limit" type="number" required value={formData.ai_token_limit} onChange={handleChange} placeholder="e.g. 100000" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="storage_limit_gb">Storage Limit (GB)</Label>
                                <Input id="storage_limit_gb" type="number" required value={formData.storage_limit_gb} onChange={handleChange} placeholder="e.g. 50" />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                <Label>AI Tutor Access</Label>
                                <Switch checked={formData.has_ai_tutor} onCheckedChange={(c) => handleSwitchChange('has_ai_tutor', c)} />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                <Label>AI Exam Evaluation</Label>
                                <Switch checked={formData.has_ai_eval} onCheckedChange={(c) => handleSwitchChange('has_ai_eval', c)} />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                <Label>Parent Portal</Label>
                                <Switch checked={formData.has_parent_portal} onCheckedChange={(c) => handleSwitchChange('has_parent_portal', c)} />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                <Label>Advanced Analytics</Label>
                                <Switch checked={formData.has_analytics} onCheckedChange={(c) => handleSwitchChange('has_analytics', c)} />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                <Label>Career Guidance AI</Label>
                                <Switch checked={formData.has_career_guidance} onCheckedChange={(c) => handleSwitchChange('has_career_guidance', c)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                    <Button variant="outline" type="button" className="text-slate-500">
                        <EyeOff className="mr-2 h-4 w-4" />
                        Save as Draft
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Publish Plan
                    </Button>
                </div>
            </form>
        </div>
    );
}
