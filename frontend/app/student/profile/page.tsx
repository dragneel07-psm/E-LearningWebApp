'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Book, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usersAPI, academicAPI, Student, User as UserType } from '@/lib/api/saas';
import { toast } from 'sonner';

export default function ProfilePage() {
    const [profile, setProfile] = useState<Student | null>(null);
    const [userAccount, setUserAccount] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            // 1. Get User Account
            // Since login might not set token perfectly for 'me', we fallback to list
            const accounts = await usersAPI.getAccounts();
            // In real app, getMe()
            const account = accounts.length > 0 ? accounts[0] : null; // Hack for dev if no auth
            setUserAccount(account);

            // 2. Get Student Profile
            const students = await academicAPI.getStudents();
            const student = students.length > 0 ? students[0] : null;
            setProfile(student);

        } catch (error) {
            console.error('Failed to load profile', error);
            toast.error("Failed to load profile details.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;

    if (!profile) return <div className="p-8 text-center text-red-500">Profile not found. Please contact admin.</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
                <p className="text-slate-600">Manage your account settings and view personal details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <Card className="md:col-span-1 p-6 text-center h-fit border shadow-sm">
                    <div className="flex justify-center mb-4">
                        <Avatar className="h-32 w-32 border-4 border-indigo-50">
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback className="text-4xl bg-indigo-600 text-white">
                                {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{profile.first_name} {profile.last_name}</h2>
                    <p className="text-slate-500 mb-4">{profile.email}</p>
                    <div className="flex justify-center gap-2">
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Student</Badge>
                        <Badge className={`bg-${profile.is_active ? 'green' : 'red'}-100 text-${profile.is_active ? 'green' : 'red'}-700 hover:bg-green-100`}>
                            {profile.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </Card>

                {/* Settings Form */}
                <Card className="md:col-span-2 overflow-hidden border shadow-sm">
                    <Tabs defaultValue="personal" className="w-full">
                        <div className="border-b px-6 pt-4 bg-slate-50/50">
                            <TabsList className="bg-transparent p-0 gap-6 h-auto">
                                <TabsTrigger value="personal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none pb-3 px-0 text-slate-500 data-[state=active]:text-indigo-600 font-medium">
                                    <User className="h-4 w-4 mr-2" /> Personal
                                </TabsTrigger>
                                <TabsTrigger value="academic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none pb-3 px-0 text-slate-500 data-[state=active]:text-indigo-600 font-medium">
                                    <Book className="h-4 w-4 mr-2" /> Academic
                                </TabsTrigger>
                                <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none pb-3 px-0 text-slate-500 data-[state=active]:text-indigo-600 font-medium">
                                    <Lock className="h-4 w-4 mr-2" /> Security
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6">
                            <TabsContent value="personal" className="space-y-4 mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name</Label>
                                        <Input id="firstName" defaultValue={profile.first_name} className="bg-slate-50" readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input id="lastName" defaultValue={profile.last_name} className="bg-slate-50" readOnly />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" defaultValue={profile.email} className="bg-slate-50" readOnly />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" defaultValue={userAccount?.phone_number || ''} placeholder="Not set" />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button className="bg-indigo-600 hover:bg-indigo-700">Save Changes</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="academic" className="space-y-4 mt-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Student ID</p>
                                        <p className="font-semibold text-slate-900 text-sm truncate">{profile.student_id}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Class ID</p>
                                        <p className="font-semibold text-slate-900 text-sm">{profile.academic_class || 'Not Assigned'}</p>
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold text-slate-900 mt-4 mb-2">Learning Preferences</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-md">
                                        <span className="text-sm text-slate-700">Style</span>
                                        <Badge variant="secondary">{profile.learning_style || 'Not Set'}</Badge>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="security" className="space-y-4 mt-0">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPass">Current Password</Label>
                                    <Input id="currentPass" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="newPass">New Password</Label>
                                    <Input id="newPass" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPass">Confirm New Password</Label>
                                    <Input id="confirmPass" type="password" />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button variant="destructive">Change Password</Button>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
}
