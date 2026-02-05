'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { billingAPI, academicAPI, FeeStructure, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';
import { CreditCard, Plus, Trash2, Edit, Loader2, DollarSign, Wallet, Rocket } from 'lucide-react';
import { FeeAssignmentDialog } from '@/components/billing/FeeAssignmentDialog';

export default function FeeStructurePage() {
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<FeeStructure>>({
        name: '',
        amount: 0,
        frequency: 'monthly',
        academic_class: null,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [feesData, classesData] = await Promise.all([
                billingAPI.getFeeStructures(),
                academicAPI.getClasses()
            ]);
            setFeeStructures(feesData);
            setClasses(classesData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load fee structures');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingFee(null);
        setFormData({
            name: '',
            amount: 0,
            frequency: 'monthly',
            academic_class: null,
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (fee: FeeStructure) => {
        setEditingFee(fee);
        setFormData(fee);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.amount || formData.amount <= 0) {
            toast.error('Please enter a valid name and amount');
            return;
        }

        try {
            if (editingFee?.fee_id) {
                await billingAPI.updateFeeStructure(editingFee.fee_id, formData);
                toast.success('Fee structure updated');
            } else {
                await billingAPI.createFeeStructure(formData);
                toast.success('Fee structure created');
            }
            setIsDialogOpen(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save fee structure');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee structure? This will not affect existing assigned fees.')) return;

        try {
            await billingAPI.deleteFeeStructure(id);
            toast.success('Fee structure removed');
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete fee structure');
        }
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Wallet className="h-8 w-8 text-emerald-600" /> Fee Structures
                    </h1>
                    <p className="text-slate-500">Define different types of fees and their amounts.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAssignmentDialogOpen(true)} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold gap-2">
                        <Rocket className="h-4 w-4" /> Bulk Assign Fees
                    </Button>
                    <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 gap-2 font-bold">
                        <Plus className="h-4 w-4" /> Add New Fee
                    </Button>
                </div>
            </header>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b">
                    <CardTitle className="text-lg font-bold">Defined Fee Types</CardTitle>
                    <CardDescription>Common fees assigned to students throughout the year.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Fee Name</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Applicable To</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {feeStructures.map((fee) => (
                                <TableRow key={fee.fee_id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-bold text-slate-900 capitalize">{fee.name}</TableCell>
                                    <TableCell>
                                        <div className="font-black text-emerald-600">
                                            ${fee.amount.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize border-slate-200 text-slate-600 font-medium">
                                            {fee.frequency}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {fee.academic_class ? (
                                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                                                {classes.find(c => c.id.toString() === fee.academic_class?.toString())?.name || 'Class ID: ' + fee.academic_class}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium italic">Standard (All Classes)</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleOpenEdit(fee)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(fee.fee_id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {feeStructures.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                                        No fee structures defined. Click &quot;Add New Fee&quot; to start.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            {editingFee ? 'Edit Fee Structure' : 'Create New Fee'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right font-bold text-slate-700">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3 border-slate-200 focus:ring-emerald-500"
                                placeholder="e.g. Monthly Tuition"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right font-bold text-slate-700">Amount</Label>
                            <div className="col-span-3 relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    className="pl-9 border-slate-200 focus:ring-emerald-500"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right font-bold text-slate-700">Frequency</Label>
                            <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v as any })}>
                                <SelectTrigger className="col-span-3 border-slate-200">
                                    <SelectValue placeholder="Select Frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="one_time">One Time</SelectItem>
                                    <SelectItem value="annual">Annual</SelectItem>
                                    <SelectItem value="term">Per Term</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right font-bold text-slate-700">Class Focus</Label>
                            <Select
                                value={formData.academic_class?.toString() || 'standard'}
                                onValueChange={v => setFormData({ ...formData, academic_class: v === 'standard' ? null : v })}
                            >
                                <SelectTrigger className="col-span-3 border-slate-200">
                                    <SelectValue placeholder="Select Class (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Standard (Applicable to All)</SelectItem>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-200">Cancel</Button>
                        <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold px-8">
                            {editingFee ? 'Update Structure' : 'Create Structure'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FeeAssignmentDialog
                open={isAssignmentDialogOpen}
                onOpenChange={setIsAssignmentDialogOpen}
                feeStructures={feeStructures}
                classes={classes}
            />
        </div>
    );
}
