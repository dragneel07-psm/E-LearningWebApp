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
import { Plus, Search, Trash2, Edit, Megaphone, Users, Calendar } from 'lucide-react';
import { academicAPI, Notice, AcademicClass, Student } from '@/lib/api/saas';
import { toast } from 'sonner';

export default function AdminNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Notice>>({
        title: '',
        content: '',
        category: 'General',
        priority: 'normal',
        target_audience: 'school',
        target_class: '', // ID
        target_student: '',
        expiry_date: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [fetchedNotices, fetchedClasses, fetchedStudents] = await Promise.all([
                academicAPI.getNotices(),
                academicAPI.getClasses(),
                academicAPI.getStudents(),
            ]);
            // Sort by date desc
            fetchedNotices.sort((a, b) => new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime());
            setNotices(fetchedNotices);
            setClasses(fetchedClasses);
            setStudents(fetchedStudents);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load notices');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            if (!formData.title || !formData.content) {
                toast.error('Please fill in required fields');
                return;
            }

            const payload = new FormData();
            Object.keys(formData).forEach(key => {
                const value = formData[key as keyof typeof formData];
                if (value !== null && value !== undefined && value !== '') {
                    payload.append(key, value as string);
                }
            });

            // Specific logic for audience cleanup - handled by backend mostly but good to be explicit
            if (formData.target_audience === 'school') {
                payload.delete('target_class');
                payload.delete('target_student');
            } else if (formData.target_audience === 'class') {
                payload.delete('target_student');
            } else if (formData.target_audience === 'student') {
                payload.delete('target_class');
            }

            if (selectedFile) {
                payload.append('attachment', selectedFile);
            }

            await academicAPI.createNotice(payload as any);
            toast.success('Notice published successfully');
            setIsCreateOpen(false);
            setFormData({
                title: '',
                content: '',
                category: 'General',
                priority: 'normal',
                target_audience: 'school',
                target_class: '',
                target_student: '',
                expiry_date: '',
            });
            setSelectedFile(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to publish notice');
        }
    };

    const handleEdit = async () => {
        if (!selectedNotice) return;
        try {
            const payload = new FormData();
            Object.keys(formData).forEach(key => {
                const value = formData[key as keyof typeof formData];
                // Append only if it has a value, or explicit nulls if needed by backend (usually not for partial update)
                // For updates, we generally want to send what's changed or all fields.
                if (value !== null && value !== undefined) {
                    payload.append(key, value as string);
                }
            });

            // Handle audience cleanup logic for FormData if needed, though backend should handle it.
            if (formData.target_audience === 'school') {
                payload.delete('target_class');
                payload.delete('target_student');
            }

            if (selectedFile) {
                payload.append('attachment', selectedFile);
            }

            await academicAPI.updateNotice(selectedNotice.notice_id!, payload as any);
            toast.success('Notice updated successfully');
            setIsEditOpen(false);
            setSelectedNotice(null);
            setSelectedFile(null);
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
        setSelectedNotice(notice);
        setFormData({
            title: notice.title,
            content: notice.content,
            category: notice.category,
            priority: notice.priority,
            target_audience: notice.target_audience,
            target_class: notice.target_class || '',
            target_student: notice.target_student || '',
            expiry_date: notice.expiry_date || '',
        });
        setSelectedFile(null); // Reset file selection
        setIsEditOpen(true);
    };

    const filteredNotices = notices.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getClassName = (classId: string | null) => {
        if (!classId) return 'N/A';
        const cls = classes.find(c => c.id.toString() === classId);
        return cls ? cls.name : 'Unknown Class';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notices Board</h1>
                    <p className="text-muted-foreground">Manage school-wide and class-specific announcements.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> Create Notice
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
                {filteredNotices.map((notice) => (
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
                                        {new Date(notice.published_date || 0).toLocaleDateString()}
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
                                        <Users className="h-3 w-3" /> {getClassName(notice.target_class || null)}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded ml-auto">
                                    {notice.category}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(notice)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(notice.notice_id!)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
                {filteredNotices.length === 0 && !loading && (
                    <div className="col-span-full text-center p-12 text-muted-foreground border-dashed border-2 rounded-lg">
                        <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No notices found</p>
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Create New Notice</DialogTitle>
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
                                        <SelectItem value="Holiday">Holiday</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={v =>
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

                        <div className="grid gap-2">
                            <Label>Attachment (Image/PDF)</Label>
                            <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Target Audience</Label>
                            <Select
                                value={formData.target_audience}
                                onValueChange={v =>
                                    setFormData({ ...formData, target_audience: v as Notice['target_audience'] })
                                }
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="school">Whole School</SelectItem>
                                    <SelectItem value="class">Specific Class</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.target_audience === 'class' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Select Class</Label>
                                <Select value={formData.target_class || ''} onValueChange={v => setFormData({ ...formData, target_class: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {formData.target_audience === 'student' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Select Student</Label>
                                <Select value={formData.target_student || ''} onValueChange={v => setFormData({ ...formData, target_student: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                                    <SelectContent>
                                        {students.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name} ({s.id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Publish Notice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
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
                                        <SelectItem value="Holiday">Holiday</SelectItem>
                                        <SelectItem value="Emergency">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={v =>
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

                        <div className="grid gap-2">
                            <Label>Attachment (Image/PDF)</Label>
                            <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setSelectedFile(e.target.files[0]);
                                    }
                                }}
                            />
                            {selectedNotice?.attachment && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Current attachment: <a href={selectedNotice.attachment} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a>
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Target Audience</Label>
                            <Select
                                value={formData.target_audience}
                                onValueChange={v =>
                                    setFormData({ ...formData, target_audience: v as Notice['target_audience'] })
                                }
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="school">Whole School</SelectItem>
                                    <SelectItem value="class">Specific Class</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.target_audience === 'class' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Select Class</Label>
                                <Select value={formData.target_class || ''} onValueChange={v => setFormData({ ...formData, target_class: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {formData.target_audience === 'student' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Select Student</Label>
                                <Select value={formData.target_student || ''} onValueChange={v => setFormData({ ...formData, target_student: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                                    <SelectContent>
                                        {students.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name} ({s.id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEdit}>Update Notice</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
