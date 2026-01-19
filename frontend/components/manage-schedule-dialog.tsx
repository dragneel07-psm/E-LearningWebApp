'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { academicAPI, Timetable, AcademicClass } from '@/lib/api';

interface ManageScheduleDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function ManageScheduleDialog({ open, onOpenChange, trigger }: ManageScheduleDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [timetable, setTimetable] = useState<Timetable[]>([]);
    const [days] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday']);

    // Form State
    const [formData, setFormData] = useState({
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        subject_name: '',
        room_number: ''
    });

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const data = await academicAPI.getClasses();
                setClasses(data);
                if (data.length > 0) setSelectedClass(data[0].class_id);
            } catch (error) {
                console.error("Failed to load classes", error);
            }
        };
        if (open || isOpen) fetchClasses();
    }, [open, isOpen]);

    useEffect(() => {
        if (!selectedClass) return;
        const fetchTimetable = async () => {
            try {
                // In a real app, we might filter by class on backend
                const allTimetable = await academicAPI.getTimetable();
                setTimetable(allTimetable.filter(t => t.academic_class === selectedClass));
            } catch (error) {
                console.error("Failed to load timetable", error);
            }
        };
        fetchTimetable();
    }, [selectedClass]);

    const handleOpenChange = (val: boolean) => {
        setIsOpen(val);
        if (onOpenChange) onOpenChange(val);
    };

    const effectiveOpen = open !== undefined ? open : isOpen;

    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass) return;
        setLoading(true);

        try {
            await academicAPI.createTimetable({
                ...formData,
                academic_class: selectedClass,
                teacher: null // Optional for now
            });

            // Refresh
            const allTimetable = await academicAPI.getTimetable();
            setTimetable(allTimetable.filter(t => t.academic_class === selectedClass));

            // Reset partial form
            setFormData(prev => ({ ...prev, subject_name: '', room_number: '' }));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to add slot: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this slot?')) return;
        try {
            await academicAPI.deleteTimetable(id);
            // Refresh
            const allTimetable = await academicAPI.getTimetable();
            setTimetable(allTimetable.filter(t => t.academic_class === selectedClass));
        } catch (error) {
            console.error('Failed to delete slot', error);
            alert("Failed to delete slot");
        }
    };

    return (
        <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Class Schedule</DialogTitle>
                </DialogHeader>

                <div className="flex gap-4 items-center py-4 border-b">
                    <Label>Select Class:</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(c => (
                                <SelectItem key={c.class_id} value={c.class_id}>Grade {c.grade}-{c.section}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pt-4">
                    {/* List */}
                    <div className="md:col-span-2 overflow-y-auto space-y-4 pr-2">
                        {days.map(day => {
                            const daySlots = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                            if (daySlots.length === 0) return null;
                            return (
                                <div key={day} className="border rounded-lg p-3">
                                    <h3 className="font-semibold text-sm mb-2 text-indigo-600">{day}</h3>
                                    <div className="space-y-2">
                                        {daySlots.map(slot => (
                                            <div key={slot.timetable_id} className="text-xs flex justify-between items-center bg-slate-50 p-2 rounded">
                                                <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}: <strong>{slot.subject_name}</strong> ({slot.room_number})</span>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDelete(slot.timetable_id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {timetable.length === 0 && <div className="text-center text-slate-500 py-10">No schedule found for this class.</div>}
                    </div>

                    {/* Add Form */}
                    <div className="bg-slate-50 p-4 rounded-lg h-fit">
                        <h3 className="font-semibold mb-4">Add New Slot</h3>
                        <form onSubmit={handleAddSlot} className="space-y-3">
                            <div className="grid gap-1">
                                <Label htmlFor="day" className="text-xs">Day</Label>
                                <Select value={formData.day_of_week} onValueChange={(v) => setFormData({ ...formData, day_of_week: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-1">
                                    <Label htmlFor="start" className="text-xs">Start</Label>
                                    <Input type="time" required value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                                </div>
                                <div className="grid gap-1">
                                    <Label htmlFor="end" className="text-xs">End</Label>
                                    <Input type="time" required value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="subject" className="text-xs">Subject</Label>
                                <Input required placeholder="Physics" value={formData.subject_name} onChange={e => setFormData({ ...formData, subject_name: e.target.value })} />
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="room" className="text-xs">Room</Label>
                                <Input placeholder="101" value={formData.room_number} onChange={e => setFormData({ ...formData, room_number: e.target.value })} />
                            </div>
                            <Button type="submit" size="sm" className="w-full mt-2" disabled={loading}>
                                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />} Add
                            </Button>
                        </form>
                    </div>
                </div>

                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
