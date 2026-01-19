'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { saasApi, GlobalSettings } from '@/lib/api/saas';
import { toast } from "sonner";

export default function SystemSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<GlobalSettings>({
        site_name: '',
        support_email: '',
        default_language: 'en',
        maintenance_mode: false,
        allow_registration: true
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await saasApi.getSettings();
            setSettings(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await saasApi.updateSettings(settings);
            toast.success("System configurations updated.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = <K extends keyof GlobalSettings>(field: K, value: GlobalSettings[K]) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="p-8 space-y-8 max-w-4xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
                <p className="text-slate-500">Configure global platform behavior and defaults.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Configuration</CardTitle>
                        <CardDescription>Basic site details and contact info.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="site_name">Site Name</Label>
                            <Input
                                id="site_name"
                                value={settings.site_name}
                                onChange={(e) => handleChange('site_name', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="support_email">Support Email</Label>
                            <Input
                                id="support_email"
                                type="email"
                                value={settings.support_email}
                                onChange={(e) => handleChange('support_email', e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Default Language</Label>
                            <Select value={settings.default_language} onValueChange={(val) => handleChange('default_language', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English (US)</SelectItem>
                                    <SelectItem value="es">Spanish</SelectItem>
                                    <SelectItem value="fr">French</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Access Control & System Status</CardTitle>
                        <CardDescription>Manage site availability and registration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label className="text-base">Allow New Registrations</Label>
                                <p className="text-sm text-slate-500">
                                    If disabled, no new schools/tenants can sign up.
                                </p>
                            </div>
                            <Switch
                                checked={settings.allow_registration}
                                onCheckedChange={(c) => handleChange('allow_registration', c)}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                                <Label className="text-base text-red-600">Maintenance Mode</Label>
                                <p className="text-sm text-slate-500">
                                    Disables access for all non-admin users. Use with caution.
                                </p>
                            </div>
                            <Switch
                                checked={settings.maintenance_mode}
                                onCheckedChange={(c) => handleChange('maintenance_mode', c)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t p-4 flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Configuration
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}
