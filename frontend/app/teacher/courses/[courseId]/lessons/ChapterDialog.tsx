'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { academicAPI, Chapter } from '@/lib/api';
import { toast } from 'sonner';

interface ChapterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chapter: Chapter | null;
    subjectId: number;
    onSuccess: () => void;
}

export function ChapterDialog({ open, onOpenChange, chapter, subjectId, onSuccess }: ChapterDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [order, setOrder] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (chapter) {
            setTitle(chapter.title);
            setDescription(chapter.description || '');
            setOrder(chapter.order);
        } else {
            setTitle('');
            setDescription('');
            setOrder(0);
        }
    }, [chapter, open]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setSaving(true);
        try {
            const data = {
                title,
                description,
                order,
                subject: subjectId
            };

            if (chapter) {
                await academicAPI.updateChapter(chapter.id, data);
                toast.success('Chapter updated');
            } else {
                await academicAPI.createChapter(data);
                toast.success('Chapter created');
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save chapter:', error);
            toast.error('Failed to save chapter');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{chapter ? 'Edit Chapter' : 'Create New Chapter'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Chapter Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Introduction to Algebra"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What will students learn in this chapter?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="order">Display Order</Label>
                        <Input
                            id="order"
                            type="number"
                            value={order}
                            onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : (chapter ? 'Update' : 'Create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
