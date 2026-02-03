'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Settings, Shield, Globe, Bell } from "lucide-react";
import { saasApi, GlobalSettings } from '@/lib/api/saas';
import { toast } from "sonner";
import { motion } from "framer-motion";

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

    if (isLoading) return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

    return (
        <div className="p-8 lg:p-10 max-w-5xl mx-auto space-y-8 min-h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400">Configure global platform behavior and defaults.</p>
                </div>
            </motion.div>

            <form onSubmit={handleSave} className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                                <CardTitle className="text-xl text-slate-900 dark:text-white">General Configuration</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 dark:text-slate-400">Basic site details and publicly visible contact info.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="site_name" className="text-slate-700 dark:text-slate-300">Site Name</Label>
                                    <Input
                                        id="site_name"
                                        value={settings.site_name}
                                        onChange={(e) => handleChange('site_name', e.target.value)}
                                        className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="support_email" className="text-slate-700 dark:text-slate-300">Support Email</Label>
                                    <Input
                                        id="support_email"
                                        type="email"
                                        value={settings.support_email}
                                        onChange={(e) => handleChange('support_email', e.target.value)}
                                        className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Default Language</Label>
                                <Select value={settings.default_language} onValueChange={(val) => handleChange('default_language', val)}>
                                    <SelectTrigger className="w-full md:w-[300px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#1a1a1f] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                                        <SelectItem value="en">English (US)</SelectItem>
                                        <SelectItem value="es">Spanish</SelectItem>
                                        <SelectItem value="fr">French</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                <CardTitle className="text-xl text-slate-900 dark:text-white">Access Control & System Status</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 dark:text-slate-400">Manage site availability and registration policies.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="flex items-center justify-between space-x-2 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-slate-900 dark:text-white">Allow New Registrations</Label>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        If disabled, no new schools/tenants can sign up. Existing users are unaffected.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.allow_registration}
                                    onCheckedChange={(c) => handleChange('allow_registration', c)}
                                    className="data-[state=checked]:bg-indigo-600"
                                />
                            </div>

                            <div className="flex items-center justify-between space-x-2 p-4 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-red-700 dark:text-red-400">Maintenance Mode</Label>
                                    <p className="text-sm text-red-600/80 dark:text-red-400/80">
                                        Disables access for all non-admin users. Use with caution for scheduled downtime.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.maintenance_mode}
                                    onCheckedChange={(c) => handleChange('maintenance_mode', c)}
                                    className="data-[state=checked]:bg-red-600"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-end"
                >
                    <Button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-8 shadow-lg shadow-indigo-600/20"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Configuration
                    </Button>
                </motion.div>
            </form>
        </div>
    );
}
