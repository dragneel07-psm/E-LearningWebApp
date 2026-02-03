'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { billingAPI, academicAPI, FeeStructure, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Users } from 'lucide-react';

export default function FeeStructurePage() {
    const [fees, setFees] = useState<FeeStructure[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);

    // Create/Edit State
    const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        academic_class: '',
        frequency: 'monthly'
    });

    // Assign Dialog
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
    const [assignClassId, setAssignClassId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [feesData, classesData] = await Promise.all([
                billingAPI.getFeeStructures(),
                academicAPI.getClasses() // Assuming this exists or similar
            ]);
            setFees(feesData);
            setClasses(classesData);
        } catch (error) {
            toast.error('Failed to load fee structures');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.amount) {
            return toast.error("Name and Amount are required");
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                academic_class: formData.academic_class || null,
                frequency: formData.frequency as any
            };

            if (editingFee) {
                const updated = await billingAPI.updateFeeStructure(editingFee.fee_id, payload);
                setFees(prev => prev.map(f => f.fee_id === updated.fee_id ? updated : f));
                toast.success('Fee updated');
            } else {
                const created = await billingAPI.createFeeStructure(payload);
                setFees(prev => [...prev, created]);
                toast.success('Fee created');
            }
            setIsDialogOpen(false);
            setEditingFee(null);
            setFormData({ name: '', amount: '', academic_class: '', frequency: 'monthly' });
        } catch (error) {
            toast.error('Failed to save fee');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (fee: FeeStructure) => {
        setEditingFee(fee);
        setFormData({
            name: fee.name,
            amount: fee.amount.toString(),
            academic_class: fee.academic_class || '',
            frequency: fee.frequency
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will not affect already assigned fees.')) return;
        try {
            await billingAPI.deleteFeeStructure(id);
            setFees(prev => prev.filter(f => f.fee_id !== id));
            toast.success('Fee deleted');
        } catch (error) {
            toast.error('Failed to delete fee');
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedFeeId || !assignClassId || !dueDate) {
            return toast.error("All fields are required");
        }

        setAssigning(true);
        try {
            await billingAPI.assignBulkFees({
                fee_structure_id: selectedFeeId,
                academic_class_id: assignClassId,
                due_date: dueDate
            });
            toast.success('Fees assigned successfully to the class');
            setAssignDialogOpen(false);
        } catch (error) {
            toast.error('Failed to assign fees');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fee Structures</h1>
                    <p className="text-slate-500">Manage tuition, exam, and other fee types.</p>
                </div>
                <Button onClick={() => {
                    setEditingFee(null);
                    setFormData({ name: '', amount: '', academic_class: '', frequency: 'monthly' });
                    setIsDialogOpen(true);
                }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Fee
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fees.map((fee) => (
                                <TableRow key={fee.fee_id}>
                                    <TableCell className="font-medium">{fee.name}</TableCell>
                                    <TableCell>${fee.amount}</TableCell>
                                    <TableCell className="capitalize">{fee.frequency.replace('_', ' ')}</TableCell>
                                    <TableCell>
                                        {fee.academic_class ? classes.find(c => c.id.toString() === fee.academic_class?.toString())?.name || 'Unknown' : 'All Classes'}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setSelectedFeeId(fee.fee_id);
                                            // Pre-select class if fee is specific
                                            setAssignClassId(fee.academic_class?.toString() || '');
                                            setAssignDialogOpen(true);
                                        }}>
                                            <Users className="h-4 w-4 mr-1" /> Assign
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(fee)}>
                                            <Edit className="h-4 w-4 text-slate-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(fee.fee_id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {fees.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                        No fee structures found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingFee ? 'Edit Fee' : 'Create New Fee'}</DialogTitle>
                        <DialogDescription>Define the fee amount and applicability.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Tuition Fee" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount</label>
                                <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Frequency</label>
                                <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="one_time">One Time</SelectItem>
                                        <SelectItem value="annual">Annual</SelectItem>
                                        <SelectItem value="term">Term-wise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Applicable Class (Optional)</label>
                            <Select value={formData.academic_class} onValueChange={v => setFormData({ ...formData, academic_class: v === 'all' ? '' : v })}>
                                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Fee to Class</DialogTitle>
                        <DialogDescription>
                            This will create a pending fee record for every student in the selected class.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Class</label>
                            <Select value={assignClassId} onValueChange={setAssignClassId}>
                                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date</label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkAssign} disabled={assigning}>
                            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm Assignment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
