'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { academicAPI, Lesson, LessonMaterial } from '@/lib/api';
import { toast } from 'sonner';
import { FileText, Video, Link as LinkIcon, Paperclip, Plus, Trash2, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamic import for ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface LessonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lesson: Lesson | null;
    chapterId: number;
    onSuccess: () => void;
}

export function LessonDialog({ open, onOpenChange, lesson, chapterId, onSuccess }: LessonDialogProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(45);
    const [isPublished, setIsPublished] = useState(false);
    const [order, setOrder] = useState(0);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('content');

    // Materials state
    const [materials, setMaterials] = useState<LessonMaterial[]>([]);
    const [newMaterialTitle, setNewMaterialTitle] = useState('');
    const [newMaterialLink, setNewMaterialLink] = useState('');
    const [newMaterialFile, setNewMaterialFile] = useState<File | null>(null);
    const [uploadingMaterial, setUploadingMaterial] = useState(false);

    useEffect(() => {
        if (lesson) {
            setTitle(lesson.title);
            setContent(lesson.content || '');
            setVideoUrl(lesson.video_url || '');
            setDurationMinutes(lesson.duration_minutes);
            setIsPublished(lesson.is_published);
            setOrder(lesson.order);
            setMaterials(lesson.materials || []);
        } else {
            setTitle('');
            setContent('');
            setVideoUrl('');
            setDurationMinutes(45);
            setIsPublished(false);
            setOrder(0);
            setMaterials([]);
        }
        setActiveTab('content');
    }, [lesson, open]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            const data = {
                title,
                content,
                video_url: videoUrl || null,
                duration_minutes: durationMinutes,
                is_published: isPublished,
                order,
                chapter: chapterId
            };

            if (lesson) {
                await academicAPI.updateLesson(lesson.id, data);
                toast.success('Lesson updated');
            } else {
                await academicAPI.createLesson(data);
                toast.success('Lesson created');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save lesson:', error);
            toast.error('Failed to save lesson');
        } finally {
            setSaving(false);
        }
    };

    const handleAddMaterial = async () => {
        if (!lesson) {
            toast.error('Please save the lesson first before adding materials');
            return;
        }
        if (!newMaterialTitle.trim()) {
            toast.error('Material title is required');
            return;
        }

        setUploadingMaterial(true);
        try {
            const formData = new FormData();
            formData.append('lesson', lesson.id.toString());
            formData.append('title', newMaterialTitle);

            if (newMaterialFile) {
                formData.append('file', newMaterialFile);
                formData.append('material_type', getMaterialType(newMaterialFile.name));
            } else if (newMaterialLink) {
                formData.append('link', newMaterialLink);
                formData.append('material_type', 'link');
            } else {
                toast.error('Please provide a file or a link');
                return;
            }

            const material = await academicAPI.createMaterial(formData);
            setMaterials([...materials, material]);
            setNewMaterialTitle('');
            setNewMaterialLink('');
            setNewMaterialFile(null);
            toast.success('Material added');
        } catch (error) {
            console.error('Failed to upload material:', error);
            toast.error('Failed to upload material');
        } finally {
            setUploadingMaterial(false);
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        try {
            await academicAPI.deleteMaterial(id);
            setMaterials(materials.filter(m => m.id !== id));
            toast.success('Material removed');
        } catch (error) {
            toast.error('Failed to remove material');
        }
    };

    const getMaterialType = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image';
        if (['pdf'].includes(ext || '')) return 'pdf';
        if (['mp4', 'webm'].includes(ext || '')) return 'video';
        return 'other';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>{lesson ? 'Edit Lesson' : 'Create New Lesson'}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="content">Content</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="materials" disabled={!lesson}>Materials</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto py-4 px-1">
                        <TabsContent value="content" className="space-y-4 mt-0 border-none p-0">
                            <div className="space-y-2">
                                <Label htmlFor="lesson-title">Lesson Title</Label>
                                <Input
                                    id="lesson-title"
                                    placeholder="e.g. Solving Linear Equations"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lesson Content (Rich Text)</Label>
                                <div className="h-[300px] mb-12">
                                    <ReactQuill
                                        theme="snow"
                                        value={content}
                                        onChange={setContent}
                                        className="h-[250px]"
                                        modules={{
                                            toolbar: [
                                                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                                [{ 'font': [] }],
                                                ['bold', 'italic', 'underline', 'strike'],
                                                [{ 'color': [] }, { 'background': [] }],
                                                [{ 'script': 'sub' }, { 'script': 'super' }],
                                                ['blockquote', 'code-block'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                [{ 'indent': '-1' }, { 'indent': '+1' }],
                                                [{ 'direction': 'rtl' }],
                                                [{ 'align': [] }],
                                                ['link', 'image', 'video'],
                                                ['clean']
                                            ]
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 pt-4">
                                <Label htmlFor="video-url">Video Lecture URL (YouTube/Vimeo)</Label>
                                <div className="flex gap-2">
                                    <div className="bg-slate-100 p-2 rounded border">
                                        <Video className="h-5 w-5 text-red-500" />
                                    </div>
                                    <Input
                                        id="video-url"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4 mt-0 border-none p-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lesson-order">Order</Label>
                                    <Input
                                        id="lesson-order"
                                        type="number"
                                        value={order}
                                        onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                <div className="space-y-0.5">
                                    <Label>Published Status</Label>
                                    <p className="text-xs text-slate-500">Make this lesson visible to students</p>
                                </div>
                                <Switch
                                    checked={isPublished}
                                    onCheckedChange={setIsPublished}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="materials" className="space-y-6 mt-0 border-none p-0">
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                                <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Add Lesson Material
                                </h4>
                                <div className="grid gap-3">
                                    <Input
                                        placeholder="Material Title (e.g. Slides PDF)"
                                        value={newMaterialTitle}
                                        onChange={(e) => setNewMaterialTitle(e.target.value)}
                                        className="bg-white"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">File Upload</Label>
                                            <Input
                                                type="file"
                                                onChange={(e) => setNewMaterialFile(e.target.files?.[0] || null)}
                                                className="bg-white text-xs h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400">Or External Link</Label>
                                            <Input
                                                placeholder="https://..."
                                                value={newMaterialLink}
                                                onChange={(e) => setNewMaterialLink(e.target.value)}
                                                disabled={!!newMaterialFile}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleAddMaterial}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-9"
                                        disabled={uploadingMaterial}
                                    >
                                        {uploadingMaterial ? 'Uploading...' : 'Add Material'}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-500">Existing Materials</Label>
                                {materials.length === 0 ? (
                                    <p className="text-center py-8 text-slate-400 text-sm italic">No materials added to this lesson yet.</p>
                                ) : (
                                    <div className="grid gap-2">
                                        {materials.map((m) => (
                                            <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-100 p-2 rounded">
                                                        {m.material_type === 'link' ? <LinkIcon className="h-4 w-4 text-slate-500" /> : <Paperclip className="h-4 w-4 text-slate-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-slate-800">{m.title}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase">{m.material_type}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                        <a href={m.file || m.link} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteMaterial(m.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                        {saving ? 'Saving...' : (lesson ? 'Save Changes' : 'Create Lesson')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
