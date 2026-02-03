'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Upload, Save, Building, Palette, Shield, User, Globe, Mail, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function SaasProfilePage() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100
            }
        }
    };

    return (
        <div className="p-8 lg:p-10 max-w-5xl mx-auto space-y-8 min-h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <User className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Profile & Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400">Manage your SaaS company details, branding, and security.</p>
                </div>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
            >
                {/* SECTION A: COMPANY PROFILE */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Building className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                                <CardTitle className="text-xl text-slate-900 dark:text-white">Company Profile</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 dark:text-slate-400">Manage your official SaaS business identity.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName" className="text-slate-700 dark:text-slate-300">Company Name</Label>
                                    <Input id="companyName" placeholder="Acme EdTech Solutions" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxId" className="text-slate-700 dark:text-slate-300">Tax / Registration ID</Label>
                                    <Input id="taxId" placeholder="TAX-123456789" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="businessEmail" className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Mail className="w-3 h-3" /> Business Email</Label>
                                    <Input id="businessEmail" type="email" placeholder="contact@acme.com" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supportEmail" className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Mail className="w-3 h-3" /> Support Email</Label>
                                    <Input id="supportEmail" type="email" placeholder="support@acme.com" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contactNumber" className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Phone className="w-3 h-3" /> Contact Number</Label>
                                    <Input id="contactNumber" placeholder="+1 (555) 000-0000" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><MapPin className="w-3 h-3" /> Address</Label>
                                    <Input id="address" placeholder="123 Tech Park, Silicon Valley, CA" className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20">
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>

                {/* SECTION B: BRANDING */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-pink-500" />
                                <CardTitle className="text-xl text-slate-900 dark:text-white">Branding Defaults</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 dark:text-slate-400">Set default visual identity for new tenant schools.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Label className="text-slate-700 dark:text-slate-300">SaaS Logo</Label>
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-500" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-500">Click to upload logo</p>
                                        <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG (max 2MB)</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-slate-700 dark:text-slate-300">Favicon</Label>
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-500" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-500">Click to upload favicon</p>
                                        <p className="text-xs text-slate-400 mt-1">ICO, PNG (32x32)</p>
                                    </div>
                                </div>
                            </div>
                            <Separator className="bg-slate-200 dark:bg-white/10" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="primaryColor" className="text-slate-700 dark:text-slate-300">Default Primary Color</Label>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Input id="primaryColor" type="color" className="w-12 h-10 p-1 bg-transparent border-slate-300 dark:border-slate-700 cursor-pointer" defaultValue="#4F46E5" />
                                        </div>
                                        <Input type="text" defaultValue="#4F46E5" className="uppercase font-mono bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accentColor" className="text-slate-700 dark:text-slate-300">Default Accent Color</Label>
                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Input id="accentColor" type="color" className="w-12 h-10 p-1 bg-transparent border-slate-300 dark:border-slate-700 cursor-pointer" defaultValue="#10B981" />
                                        </div>
                                        <Input type="text" defaultValue="#10B981" className="uppercase font-mono bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4">
                            <Button variant="outline" className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-white">
                                Save Defaults
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>

                {/* SECTION C: SECURITY & ACCESS */}
                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-[#111114] border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none overflow-hidden">
                        <CardHeader className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                                <CardTitle className="text-xl text-slate-900 dark:text-white">Security & Access</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 dark:text-slate-400">Manage admin access protocols and session security.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="adminEmail" className="text-slate-700 dark:text-slate-300">Admin Email</Label>
                                    <Input id="adminEmail" value="admin@saas.com" readOnly className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 cursor-not-allowed" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                                    <Button variant="outline" className="w-full justify-start border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-white">
                                        Change Password...
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</Label>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Secure your account with 2FA.</p>
                                </div>
                                <Switch className="data-[state=checked]:bg-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Active Sessions</Label>
                                <div className="text-sm p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/10">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-700 dark:text-slate-300 font-medium">Chrome on MacOS (Current)</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase">Active Now</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
