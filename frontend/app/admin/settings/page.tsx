'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Save, Globe, Shield, Activity, UserCog, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await api.settings.get();
            setSettings(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await api.settings.update(settings);
            setSettings(updated);
            toast.success('Settings saved successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;
    if (!settings) return <div className="p-6">Failed to load configuration.</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
                    <p className="text-slate-500">Configure global application preferences.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="general" className="gap-2"><Globe className="h-4 w-4" /> General</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Security & Access</TabsTrigger>
                    <TabsTrigger value="staff-access" className="gap-2"><UserCog className="h-4 w-4" /> Staff Access</TabsTrigger>
                    <TabsTrigger value="system" className="gap-2"><Activity className="h-4 w-4" /> System</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Configuration</CardTitle>
                            <CardDescription>Basic details about your SaaS platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Site Name</Label>
                                    <Input
                                        value={settings.site_name}
                                        onChange={e => setSettings({ ...settings, site_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Support Email</Label>
                                    <Input
                                        type="email"
                                        value={settings.support_email}
                                        onChange={e => setSettings({ ...settings, support_email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Default Language</Label>
                                    <Select
                                        value={settings.default_language}
                                        onValueChange={v => setSettings({ ...settings, default_language: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                            <SelectItem value="fr">French</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Control</CardTitle>
                            <CardDescription>Manage registration and maintenance states.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Allow New Registrations</Label>
                                    <p className="text-sm text-slate-500">
                                        If disabled, new schools/tenants cannot sign up.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.allow_registration}
                                    onCheckedChange={c => setSettings({ ...settings, allow_registration: c })}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 border-amber-200">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-amber-900">Maintenance Mode</Label>
                                    <p className="text-sm text-amber-700">
                                        If enabled, only superusers can access the platform.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.maintenance_mode}
                                    onCheckedChange={c => setSettings({ ...settings, maintenance_mode: c })}
                                    className="data-[state=checked]:bg-amber-600"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="system">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Information</CardTitle>
                            <CardDescription>Read-only system status.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-slate-500">
                                System metrics are available on the <span className="font-semibold text-slate-700">Admin Dashboard</span>.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="staff-access">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Access Control</CardTitle>
                            <CardDescription>
                                Assign module permissions to staff accounts. School Admins always have full access.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Link href="/admin/settings/staff-access">
                                <Button variant="outline" className="gap-2">
                                    <UserCog className="h-4 w-4" />
                                    Manage Staff Roles
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
