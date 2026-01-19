'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Upload, Save, Building, Palette, Shield } from "lucide-react";

export default function SaasProfilePage() {
    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">Profile & Settings</h2>

            {/* SECTION A: COMPANY PROFILE */}
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Building className="h-5 w-5 text-indigo-500" />
                        <CardTitle>Company Profile</CardTitle>
                    </div>
                    <CardDescription>Manage your SaaS company details and contact information.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" placeholder="Acme EdTech Solutions" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taxId">Tax / Registration ID</Label>
                            <Input id="taxId" placeholder="TAX-123456789" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessEmail">Business Email</Label>
                            <Input id="businessEmail" type="email" placeholder="contact@acme.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input id="supportEmail" type="email" placeholder="support@acme.com" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactNumber">Contact Number</Label>
                            <Input id="contactNumber" placeholder="+1 (555) 000-0000" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" placeholder="123 Tech Park, Silicon Valley, CA" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end border-t p-4">
                    <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            {/* SECTION B: BRANDING */}
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Palette className="h-5 w-5 text-pink-500" />
                        <CardTitle>Branding Defaults</CardTitle>
                    </div>
                    <CardDescription>Set default branding for new tenant schools.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label>SaaS Logo</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer">
                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500">Click to upload logo</p>
                                <p className="text-xs text-slate-400">SVG, PNG, JPG (max 2MB)</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label>Favicon</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer">
                                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500">Click to upload favicon</p>
                                <p className="text-xs text-slate-400">ICO, PNG (32x32)</p>
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="primaryColor">Default Primary Color</Label>
                            <div className="flex gap-2">
                                <Input id="primaryColor" type="color" className="w-12 h-10 p-1" defaultValue="#4F46E5" />
                                <Input type="text" defaultValue="#4F46E5" className="uppercase" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="accentColor">Default Accent Color</Label>
                            <div className="flex gap-2">
                                <Input id="accentColor" type="color" className="w-12 h-10 p-1" defaultValue="#10B981" />
                                <Input type="text" defaultValue="#10B981" className="uppercase" />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end border-t p-4">
                    <Button variant="outline">
                        Save Defaults
                    </Button>
                </CardFooter>
            </Card>

            {/* SECTION C: SECURITY & ACCESS */}
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-emerald-500" />
                        <CardTitle>Security & Access</CardTitle>
                    </div>
                    <CardDescription>Manage admin access and security protocols.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="adminEmail">Admin Email</Label>
                            <Input id="adminEmail" value="admin@saas.com" readOnly className="bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Button variant="outline" className="w-full justify-start">Change Password</Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Two-Factor Authentication (2FA)</Label>
                            <p className="text-sm text-slate-500">Secure your account with 2FA.</p>
                        </div>
                        <Switch />
                    </div>
                    <div className="space-y-2">
                        <Label>Active Sessions</Label>
                        <div className="text-sm text-slate-500 p-2 bg-slate-50 dark:bg-slate-900 rounded border">
                            <div className="flex justify-between items-center">
                                <span>Chrome on MacOS (Current)</span>
                                <span className="text-green-600 text-xs font-bold">Active Now</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
