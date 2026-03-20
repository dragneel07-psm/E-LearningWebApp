// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { academicAPI, Notice } from '@/lib/api';
import { Megaphone, Calendar, Info, AlertTriangle, Clock, Loader2 } from 'lucide-react';

export default function StudentNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotices();
    }, []);

    const loadNotices = async () => {
        setLoading(true);
        try {
            const data = await academicAPI.getNotices();
            setNotices(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-6">
            <header className="text-center space-y-2">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
                    <Megaphone className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Notice Board</h1>
                <p className="text-slate-500 max-w-lg mx-auto">Latest announcements from your school and teachers.</p>
            </header>

            <div className="space-y-6">
                {notices.length > 0 ? (
                    notices.map((notice) => (
                        <Card key={notice.id} className={`border-none shadow-sm overflow-hidden transition-all hover:shadow-md ${notice.priority === 'high' ? 'bg-red-50/30 border-l-4 border-l-red-500' : 'bg-white border-l-4 border-l-indigo-500'}`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-widest px-2 py-0 border-slate-200 text-slate-500 uppercase">
                                        {notice.category}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                        <Calendar className="h-3 w-3" />
                                        {notice.published_date ? new Date(notice.published_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                                    </div>
                                </div>
                                <CardTitle className={`text-xl font-bold ${notice.priority === 'high' ? 'text-red-900' : 'text-slate-900'}`}>{notice.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">{notice.content}</p>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                            {notice.priority === 'high' ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : <Info className="h-3.5 w-3.5 text-indigo-500" />}
                                            <span className="capitalize">{notice.priority} Priority</span>
                                        </div>
                                    </div>

                                    {notice.attachment && (
                                        <a href={notice.attachment} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4">
                                            View Attachment
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card className="border-dashed border-2 border-slate-200 bg-transparent py-16 text-center">
                        <CardContent>
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                                <Clock className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No active notices</h3>
                            <p className="text-sm text-slate-500">You&apos;re all caught up! Check back later for updates.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
