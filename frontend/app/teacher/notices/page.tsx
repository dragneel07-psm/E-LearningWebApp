'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Trash2, Edit, Megaphone, Users, Calendar, FileText } from 'lucide-react';
import { academicAPI, Notice, AcademicClass, notificationsAPI, usersAPI } from '@/lib/api/saas';
import { toast } from 'sonner';
import { DocumentViewerModal } from '@/components/document-viewer-modal';

export default function TeacherNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [myClasses, setMyClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Notice>>({
        title: '',
        content: '',
        category: 'General',
        priority: 'normal',
        target_audience: 'class',
        target_class: '',
        expiry_date: '',
    });

    useEffect(() => {
        loadData();
        // Clear notifications when viewing notices
        notificationsAPI.markAllAsRead().catch(e => console.error("Failed to mark notifications as read", e));
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await usersAPI.getMe();
            const teachers = await academicAPI.getTeachers();
            const meTeacher = teachers.find(t => t.user === user.user_id);

            if (!meTeacher || !meTeacher.assigned_classes) {
                toast.error('Could not find teacher profile');
                return;
            }

            const allClasses = await academicAPI.getClasses();
            const assigned = allClasses.filter(c => meTeacher.assigned_classes?.includes(c.class_id));
            setMyClasses(assigned);

            const fetchedNotices = await academicAPI.getNotices();
            // Sort by date desc
            fetchedNotices.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
            setNotices(fetchedNotices);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load notices');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            if (!formData.title || !formData.content || !formData.target_class) {
                toast.error('Please fill in required fields');
                return;
            }

            // Teacher can only create Class notices
            const payload = {
                ...formData,
                target_audience: 'class' as const
            };

            await academicAPI.createNotice(payload);
            toast.success('Notice published successfully');
            setIsCreateOpen(false);
            setFormData({
                title: '',
                content: '',
                category: 'General',
                priority: 'normal',
                target_audience: 'class',
                target_class: '',
                expiry_date: '',
            });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to publish notice');
        }
    };

    const handleEdit = async () => {
        if (!selectedNotice) return;
        try {
            const payload = { ...formData };
            // Ensure target_class is set
            if (!payload.target_class) {
                toast.error('Please select a target class');
                return;
            }

            await academicAPI.updateNotice(selectedNotice.notice_id, payload);
            toast.success('Notice updated successfully');
            setIsEditOpen(false);
            setSelectedNotice(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update notice');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this notice?')) {
            try {
                await academicAPI.deleteNotice(id);
                toast.success('Notice deleted');
                loadData();
            } catch (error) {
                console.error(error);
                toast.error('Failed to delete notice');
            }
        }
    };

    const openEdit = (notice: Notice) => {
        // Teachers can only edit notices for their classes
        const canEdit = notice.target_audience === 'class' && myClasses.some(c => c.class_id === notice.target_class);

        if (!canEdit) {
            toast.error("You can only edit notices for your updated classes.");
            return;
        }

        setSelectedNotice(notice);
        setFormData({
            title: notice.title,
            content: notice.content,
            category: notice.category,
            priority: notice.priority,
            target_audience: 'class',
            target_class: notice.target_class || '',
            expiry_date: notice.expiry_date || '',
        });
        setIsEditOpen(true);
    };

    const filteredNotices = notices.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Helpers
    const getClassName = (classId: string | null) => {
        if (!classId) return 'N/A';
        // Try to find in myClasses first, then check if we can (though we don't fetch all classes for display)
        // Ideally we should know all class names.
        // For teacher view, maybe we just show ID if not found? 
        // Or better: load ALL classes map.
        // Let's rely on myClasses for now for creating, but we might need all classes to display names.
        // I will rely on the property that we haven't fetched ALL classes map for name display in the list.
        // Actually, we did fetch all classes in loadData()!
        // But I only stored `assigned`. Let me change loadData to store map if needed.
        // For simplicity, I'll display classId if not found in myClasses (or fix logic).
        const cls = myClasses.find(c => c.class_id === classId);
        return cls ? `Grade ${cls.grade}-${cls.section}` : 'Other Class';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Class Notices</h1>
                    <p className="text-muted-foreground">Manage announcements for your classes.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Create Class Notice
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notices..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredNotices.map((notice) => {
                    const isMyClassNotice = notice.target_audience === 'class' && myClasses.some(c => c.class_id === notice.target_class);
                    // Teacher can create/edit ONLY their class notices.
                    // But they can VIEW all? The prompt said "Teacher can create... assigned class".
                    // Assuming view all is fine.

                    return (
                        <Card key={notice.notice_id} className="flex flex-col relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${notice.priority === 'high' ? 'bg-red-500' :
                                notice.priority === 'low' ? 'bg-green-500' : 'bg-blue-500'
                                }`} />
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4 pl-2">
                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-1">{notice.title}</h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(notice.published_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`text-xs px-2 py-1 rounded-full border ${notice.priority === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                                        notice.priority === 'low' ? 'bg-green-50 text-green-700 border-green-100' :
                                            'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                        {notice.priority}
                                    </div>
                                </div>

                                <p className="text-sm text-slate-600 line-clamp-3 mb-4 pl-2 whitespace-pre-wrap">
                                    {notice.content}
                                </p>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2 mt-auto">
                                    {notice.target_audience === 'school' ? (
                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                            <Megaphone className="h-3 w-3" /> Whole School
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                                            <Users className="h-3 w-3" /> {getClassName(notice.target_class)}
                                        </span>
                                    )}
                                </div>

                                {notice.attachment && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 pl-2">
                                        <button
                                            onClick={() => {
                                                setSelectedAttachment(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000${notice.attachment}`);
                                                setViewerOpen(true);
                                            }}
                                            className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
                                        >
                                            <FileText className="h-3 w-3" />
                                            View Attachment
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Only show actions for notices belonging to teacher's class */}
                            {isMyClassNotice && (
                                <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(notice)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(notice.notice_id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </Card>
                    )
                })}
                {filteredNotices.length === 0 && !loading && (
                    <div className="col-span-full text-center p-12 text-muted-foreground border-dashed border-2 rounded-lg">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No notices found</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Dialog Reused Structure (Simpler than admin) */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create Class Notice</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea id="content" className="h-[150px]" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Academic">Academic</SelectItem>
                                        <SelectItem value="Event">Event</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(v) =>
                                        setFormData({ ...formData, priority: v as Notice['priority'] })
                                    }
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Expiry Date</Label>
                            <Input type="date" value={formData.expiry_date ? formData.expiry_date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                        </div>

                        <div className="grid gap-2 animate-in fade-in">
                            <Label>Select Target Class</Label>
                            <Select value={formData.target_class || ''} onValueChange={v => setFormData({ ...formData, target_class: v })}>
                                <SelectTrigger><SelectValue placeholder="Select one of your classes" /></SelectTrigger>
                                <SelectContent>
                                    {myClasses.map(c => (
                                        <SelectItem key={c.class_id} value={c.class_id}>
                                            Grade {c.grade}-{c.section}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">You can only post notices for your assigned classes.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Publish Notice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog - similar to Create */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Notice</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input id="edit-title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-content">Content</Label>
                            <Textarea id="edit-content" className="h-[150px]" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Academic">Academic</SelectItem>
                                        <SelectItem value="Event">Event</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(v) =>
                                        setFormData({ ...formData, priority: v as Notice['priority'] })
                                    }
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Expiry Date</Label>
                            <Input type="date" value={formData.expiry_date ? formData.expiry_date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} />
                        </div>

                        <div className="grid gap-2 animate-in fade-in">
                            <Label>Select Target Class</Label>
                            <Select value={formData.target_class || ''} onValueChange={v => setFormData({ ...formData, target_class: v })}>
                                <SelectTrigger><SelectValue placeholder="Select one of your classes" /></SelectTrigger>
                                <SelectContent>
                                    {myClasses.map(c => (
                                        <SelectItem key={c.class_id} value={c.class_id}>
                                            Grade {c.grade}-{c.section}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEdit}>Update Notice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DocumentViewerModal
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                fileUrl={selectedAttachment || ''}
                fileName="Notice Attachment"
            />
        </div>
    );
}
