'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Server, Save } from 'lucide-react';
import Link from 'next/link';
import { coreAPI, Tenant } from '@/lib/api';

export default function TenantConfigPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        try {
            setLoading(true);
            const data = await coreAPI.getTenants();
            setTenants(data);
            if (data.length > 0) {
                setSelectedTenant(data[0]);
            }
        } catch (error) {
            console.error('Failed to load tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTenant) return;
        try {
            await coreAPI.updateTenant(selectedTenant.tenant_id, {
                name: selectedTenant.name,
                domain: selectedTenant.domain,
                subdomain: selectedTenant.subdomain
            });
            // Show success message
            setSuccessMsg('Tenant configuration saved successfully!');

            // Clear after 3 seconds
            setTimeout(() => {
                setSuccessMsg(null);
            }, 3000);

        } catch (error) {
            console.error('Failed to save tenant:', error);
            alert('Failed to save settings.');
        }
    };

    if (loading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900">
            <header className="flex items-center gap-4 border-b pb-6">
                <Link href="/admin/system">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenant Configurations</h1>
                    <p className="text-slate-500 text-sm">Manage school identity, domains, and global settings.</p>
                </div>
            </header>

            {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded relative shadow-sm transition-all duration-300 ease-in-out">
                    <strong className="font-bold">Success: </strong>
                    <span className="block sm:inline">{successMsg}</span>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-4">
                {/* Tenant List (Sidebar) */}
                <Card className="col-span-1 border-r h-full">
                    <CardHeader>
                        <CardTitle className="text-sm">My Schools</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {tenants.map(tenant => (
                            <div
                                key={tenant.tenant_id}
                                onClick={() => setSelectedTenant(tenant)}
                                className={`p-3 rounded-lg cursor-pointer text-sm font-medium border ${selectedTenant?.tenant_id === tenant.tenant_id ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {tenant.name}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Tenant Editor */}
                <Card className="col-span-3">
                    {selectedTenant ? (
                        <>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="h-5 w-5" /> {selectedTenant.name}
                                </CardTitle>
                                <CardDescription>ID: {selectedTenant.tenant_id}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 max-w-lg">
                                <div className="space-y-2">
                                    <Label htmlFor="name">School Name</Label>
                                    <Input
                                        id="name"
                                        value={selectedTenant.name}
                                        onChange={(e) => setSelectedTenant({ ...selectedTenant, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="domain">Custom Domain</Label>
                                    <Input
                                        id="domain"
                                        value={selectedTenant.domain || ''}
                                        placeholder="e.g. school.edu.np"
                                        onChange={(e) => setSelectedTenant({ ...selectedTenant, domain: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="subdomain">Subdomain</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="subdomain"
                                            value={selectedTenant.subdomain}
                                            onChange={(e) => setSelectedTenant({ ...selectedTenant, subdomain: e.target.value })}
                                        />
                                        <span className="text-muted-foreground text-sm">.saas.edu.np</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between border-t pt-6">
                                <span className="text-xs text-muted-foreground">Last updated: {new Date(selectedTenant.updated_at).toLocaleDateString()}</span>
                                <Button onClick={handleSave}>
                                    <Save className="mr-2 h-4 w-4" /> Save Changes
                                </Button>
                            </CardFooter>
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground p-12">
                            Select a school to configure
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
