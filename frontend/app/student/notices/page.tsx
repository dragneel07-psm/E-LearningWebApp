'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Info, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { academicAPI, Notice } from '@/lib/api';
import { DocumentViewerModal } from '@/components/document-viewer-modal';

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedFile] = useState<string | null>(null);

    useEffect(() => {
        loadNotices();
    }, []);

    const loadNotices = async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getNotices();
            setNotices(data);
        } catch (error) {
            console.error('Failed to load notices', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'holiday': return <Calendar className="h-5 w-5 text-red-500" />;
            case 'event': return <Bell className="h-5 w-5 text-indigo-500" />;
            case 'urgent': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Notices & Announcements</h1>
                <p className="text-slate-600">Stay updated with the latest news from your school.</p>
            </div>

            <div className="space-y-4">
                {notices.length === 0 ? (
                    <Card className="p-8 text-center text-slate-500">
                        <Info className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No notices at the moment.</p>
                    </Card>
                ) : (
                    notices.map(notice => (
                        <Card key={notice.notice_id} className="p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full bg-slate-50 border border-slate-100 shrink-0`}>
                                    {getIcon(notice.category)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-slate-800">{notice.title}</h3>
                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                            {notice.published_date ? new Date(notice.published_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 mb-2">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100">
                                            {notice.category}
                                        </Badge>
                                        {notice.priority === 'high' && (
                                            <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                                                Important
                                            </Badge>
                                        )}
                                    </div>

                                    <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                                        {notice.content}
                                    </p>

                                    {notice.attachment && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <a
                                                href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000${notice.attachment}`}
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                            >
                                                <FileText className="h-4 w-4" />
                                                Download Attachment
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <DocumentViewerModal
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                fileUrl={selectedFile || ''}
                fileName="Notice Attachment"
            />
        </div>
    );
}
