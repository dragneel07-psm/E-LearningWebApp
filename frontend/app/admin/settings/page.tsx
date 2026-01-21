'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { coreAPI, usersAPI, Tenant } from '@/lib/api';
import { Building2, Save, GraduationCap, Globe, Mail, Phone, Calendar, Upload } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function SchoolSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [formData, setFormData] = useState<Partial<Tenant>>({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const user = await usersAPI.getMe();
            if (user.tenant) {
                const tenantData = await coreAPI.getTenant(user.tenant);
                setTenant(tenantData);
                setFormData({
                    name: tenantData.name,
                    domain: tenantData.domain,
                    address: tenantData.address || '',
                    contact_email: tenantData.contact_email || '',
                    contact_phone: tenantData.contact_phone || '',
                    website: tenantData.website || '',
                    current_academic_year: tenantData.current_academic_year || '2024-2025',
                    established_year: tenantData.established_year || undefined
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!tenant) return;
        try {
            setSaving(true);
            await coreAPI.updateTenant(tenant.tenant_id, formData);
            toast.success("Settings saved successfully");
            // Reload to confirm matches
            const updated = await coreAPI.getTenant(tenant.tenant_id);
            setTenant(updated);
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !tenant) return;
        const file = e.target.files[0];
        const uploadData = new FormData();
        uploadData.append('logo', file);

        try {
            setSaving(true);
            await coreAPI.uploadTenantLogo(tenant.tenant_id, uploadData);
            toast.success("Logo uploaded successfully");
            const updated = await coreAPI.getTenant(tenant.tenant_id);
            setTenant(updated);
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload logo");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center">Loading settings...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">School Settings</h1>
                    <p className="text-slate-500">Manage your school profile and configurations.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="bg-white border mb-4">
                    <TabsTrigger value="general" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <Building2 className="h-4 w-4 mr-2" /> General Profile
                    </TabsTrigger>
                    <TabsTrigger value="academic" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600">
                        <GraduationCap className="h-4 w-4 mr-2" /> Academic Configuration
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Basic Information</CardTitle>
                                <CardDescription>Visible to all users and on public pages.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>School Logo</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative h-24 w-24 rounded-lg border bg-slate-100 overflow-hidden flex items-center justify-center">
                                                    {tenant?.logo ? (
                                                        <Image
                                                            src={tenant.logo}
                                                            alt="School Logo"
                                                            fill
                                                            className="object-cover"
                                                            unoptimized // Simplify for demo/remote handling
                                                        />
                                                    ) : (
                                                        <Building2 className="h-8 w-8 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Button variant="outline" size="sm" className="relative cursor-pointer" type="button">
                                                        <Upload className="h-3 w-3 mr-2" />
                                                        Upload Logo
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            accept="image/*"
                                                            onChange={handleLogoUpload}
                                                        />
                                                    </Button>
                                                    <p className="text-xs text-muted-foreground">Recommended: 512x512px PNG</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>School Name</Label>
                                            <Input
                                                value={formData.name || ''}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Ex: Spring Valley High School"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Established Year</Label>
                                            <Input
                                                type="number"
                                                value={formData.established_year || ''}
                                                onChange={(e) => setFormData({ ...formData, established_year: parseInt(e.target.value) || undefined })}
                                                placeholder="YYYY"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Website</Label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                <Input
                                                    className="pl-9"
                                                    value={formData.website || ''}
                                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                    placeholder="https://www.myschool.edu"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Details</CardTitle>
                                <CardDescription>How parents and staff can reach the administration.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Contact Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input
                                                className="pl-9"
                                                value={formData.contact_email || ''}
                                                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                                placeholder="admin@school.edu"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <Input
                                                className="pl-9"
                                                value={formData.contact_phone || ''}
                                                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <Textarea
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="123 Education Lane, Knowledge City, ST 12345"
                                        className="h-24"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="academic">
                    <Card>
                        <CardHeader>
                            <CardTitle>Academic Configuration</CardTitle>
                            <CardDescription>Manage academic years and terms.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Current Academic Year</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            className="pl-9"
                                            value={formData.current_academic_year || ''}
                                            onChange={(e) => setFormData({ ...formData, current_academic_year: e.target.value })}
                                            placeholder="Ex: 2024-2025"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        This value is used as the default for new classes and reports.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
