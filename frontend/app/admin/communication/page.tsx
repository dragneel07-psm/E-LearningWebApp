'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Bell, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CommunicationDashboard() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Communication Center</h2>
            <p className="text-muted-foreground">Manage school-wide announcements and automated alerts.</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:bg-slate-50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Templates</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Manage</div>
                        <p className="text-xs text-muted-foreground">Email & SMS Formats</p>
                        <Link href="/admin/communication/templates">
                            <Button variant="link" className="px-0 mt-2">View Templates &rarr;</Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="opacity-50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Broadcast</div>
                        <p className="text-xs text-muted-foreground">Send to All Parents/Staff</p>
                        <Button variant="link" className="px-0 mt-2" disabled>Coming Soon</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
