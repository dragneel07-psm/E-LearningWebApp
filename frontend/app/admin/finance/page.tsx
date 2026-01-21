'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    DollarSign, TrendingUp, TrendingDown, Plus, Download,
    CreditCard, Receipt, AlertCircle, Users
} from 'lucide-react';
import { billingAPI, academicAPI, FeeStructure, StudentFee, Payment, Expense, AcademicClass, FinanceDashboard } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function FinancePage() {
    const { toast } = useToast();
    const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);

    const loadData = useCallback(async () => {
        try {
            const [dashboardData, fees, studentFeesData, expensesData, classesData] = await Promise.all([
                billingAPI.getFinanceDashboard(),
                billingAPI.getFeeStructures(),
                billingAPI.getStudentFees(),
                billingAPI.getExpenses(),
                academicAPI.getClasses()
            ]);

            setDashboard(dashboardData);
            setFeeStructures(fees);
            setStudentFees(studentFeesData);
            setExpenses(expensesData);
            setClasses(classesData);
        } catch (error) {
            console.error('Failed to load finance data', error);
            toast({ title: 'Error', description: 'Failed to load finance data', variant: 'destructive' });
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Finance Management</h1>
                    <p className="text-slate-500">Manage fees, payments, and expenses</p>
                </div>
                <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${dashboard?.total_revenue?.toLocaleString() || 0}</div>
                        <p className="text-xs text-emerald-500 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" /> All-time collected
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Fees</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${dashboard?.total_pending?.toLocaleString() || 0}</div>
                        <p className="text-xs text-orange-500 mt-1">Outstanding balance</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Expenses</CardTitle>
                        <Receipt className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${dashboard?.total_expenses?.toLocaleString() || 0}</div>
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                            <TrendingDown className="h-3 w-3 mr-1" /> Operational costs
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-indigo-600 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-100">Net Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${dashboard?.net_balance?.toLocaleString() || 0}</div>
                        <p className="text-xs text-indigo-200 mt-1">Revenue - Expenses</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white border p-1 rounded-lg">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="fees">Fee Structures</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Recent Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {dashboard?.recent_payments?.slice(0, 5).map((payment: Payment) => (
                                        <div key={payment.payment_id} className="flex justify-between items-center border-b pb-3 last:border-0">
                                            <div>
                                                <div className="font-medium text-sm">{payment.student_name}</div>
                                                <div className="text-xs text-slate-500">{new Date(payment.payment_date).toLocaleDateString()}</div>
                                            </div>
                                            <span className="font-semibold text-emerald-600">${payment.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Recent Expenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {dashboard?.recent_expenses?.slice(0, 5).map((expense: Expense) => (
                                        <div key={expense.expense_id} className="flex justify-between items-center border-b pb-3 last:border-0">
                                            <div>
                                                <div className="font-medium text-sm">{expense.title}</div>
                                                <div className="text-xs text-slate-500">{expense.category}</div>
                                            </div>
                                            <span className="font-semibold text-red-600">${expense.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Fee Structures Tab */}
                <TabsContent value="fees" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Fee Structures</h3>
                        <div className="flex gap-2">
                            <AssignFeeDialog onSuccess={loadData} classes={classes} feeStructures={feeStructures} />
                            <AddFeeStructureDialog onSuccess={loadData} classes={classes} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {feeStructures.map((fee) => (
                            <Card key={fee.fee_id} className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base">{fee.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Amount:</span>
                                            <span className="font-semibold">${fee.amount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-500">Frequency:</span>
                                            <span className="text-sm capitalize">{fee.frequency}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Student Dues & Payments</h3>
                        <RecordPaymentDialog onSuccess={loadData} studentFees={studentFees} />
                    </div>
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-0">
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Fee Type</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Amount Due</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Paid</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Balance</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {studentFees.slice(0, 10).map((fee) => (
                                            <tr key={fee.student_fee_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">{fee.student_name}</td>
                                                <td className="px-4 py-3">{fee.fee_name}</td>
                                                <td className="px-4 py-3">${fee.amount_due}</td>
                                                <td className="px-4 py-3">${fee.amount_paid}</td>
                                                <td className="px-4 py-3 font-semibold">${fee.balance || 0}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${fee.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                        fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {fee.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses" className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Expense Records</h3>
                        <AddExpenseDialog onSuccess={loadData} />
                    </div>
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-0">
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Title</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Category</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Amount</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                                            <th className="px-4 py-3 text-left font-medium text-slate-500">Recorded By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {expenses.map((expense) => (
                                            <tr key={expense.expense_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium">{expense.title}</td>
                                                <td className="px-4 py-3 capitalize">{expense.category}</td>
                                                <td className="px-4 py-3 font-semibold text-red-600">${expense.amount}</td>
                                                <td className="px-4 py-3">{new Date(expense.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-slate-500">{expense.recorded_by_name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Dialog Components
function AddFeeStructureDialog({ onSuccess, classes }: { onSuccess: () => void; classes: AcademicClass[] }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<{
        name: string;
        amount: string;
        frequency: FeeStructure['frequency'];
        academic_class: string;
    }>({ name: '', amount: '', frequency: 'monthly', academic_class: '' });
    const { toast } = useToast();

    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await billingAPI.createFeeStructure({
                name: formData.name,
                amount: parseFloat(formData.amount),
                frequency: formData.frequency,
                academic_class: formData.academic_class || null
            });
            toast({ title: 'Success', description: 'Fee structure created successfully' });
            setOpen(false);
            setFormData({ name: '', amount: '', frequency: 'monthly', academic_class: '' });
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to create fee structure';
            const msg = message || 'Failed to create fee structure';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Fee Structure</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Fee Structure</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Fee Name</Label>
                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div>
                        <Label>Amount ($)</Label>
                        <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                    </div>
                    <div>
                        <Label>Frequency</Label>
                        <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v as any })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="one_time">One Time</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                                <SelectItem value="term">Term-wise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Class (Optional)</Label>
                        <Select value={formData.academic_class} onValueChange={(v) => setFormData({ ...formData, academic_class: v })}>
                            <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Fee Structure'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RecordPaymentDialog({ onSuccess, studentFees }: { onSuccess: () => void; studentFees: StudentFee[] }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<{
        student_fee: string;
        amount: string;
        method: Payment['method'];
        transaction_id: string;
        remarks: string;
    }>({ student_fee: '', amount: '', method: 'cash', transaction_id: '', remarks: '' });
    const { toast } = useToast();

    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const selectedFee = studentFees.find(f => f.student_fee_id === formData.student_fee);
            await billingAPI.recordPayment({
                student: selectedFee?.student,
                student_fee: formData.student_fee,
                amount: parseFloat(formData.amount),
                method: formData.method,
                transaction_id: formData.transaction_id || undefined,
                remarks: formData.remarks || undefined
            });
            toast({ title: 'Success', description: 'Payment recorded successfully' });
            setOpen(false);
            setFormData({ student_fee: '', amount: '', method: 'cash', transaction_id: '', remarks: '' });
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to record payment';
            const msg = message || 'Failed to record payment';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><CreditCard className="h-4 w-4 mr-2" /> Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Student Fee</Label>
                        <Select value={formData.student_fee} onValueChange={(v) => setFormData({ ...formData, student_fee: v })} required>
                            <SelectTrigger><SelectValue placeholder="Select student fee" /></SelectTrigger>
                            <SelectContent>
                                {studentFees.filter(f => f.status !== 'paid').map(f => (
                                    <SelectItem key={f.student_fee_id} value={f.student_fee_id}>
                                        {f.student_name} - {f.fee_name} (${f.balance})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Amount ($)</Label>
                        <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                    </div>
                    <div>
                        <Label>Payment Method</Label>
                        <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v as any })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Transaction ID (Optional)</Label>
                        <Input value={formData.transaction_id} onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Recording...' : 'Record Payment'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AddExpenseDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<{
        title: string;
        amount: string;
        category: Expense['category'];
        date: string;
        description: string;
    }>({ title: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0], description: '' });
    const { toast } = useToast();

    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await billingAPI.createExpense({
                title: formData.title,
                amount: parseFloat(formData.amount),
                category: formData.category,
                date: formData.date,
                description: formData.description || undefined
            });
            toast({ title: 'Success', description: 'Expense recorded successfully' });
            setOpen(false);
            setFormData({ title: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0], description: '' });
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to record expense';
            const msg = message || 'Failed to record expense';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Title</Label>
                        <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                    </div>
                    <div>
                        <Label>Amount ($)</Label>
                        <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                    </div>
                    <div>
                        <Label>Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="salary">Salary</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="utilities">Utilities</SelectItem>
                                <SelectItem value="supplies">Supplies</SelectItem>
                                <SelectItem value="events">Events</SelectItem>
                                <SelectItem value="transport">Transport</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Date</Label>
                        <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                    </div>
                    <div>
                        <Label>Description (Optional)</Label>
                        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Recording...' : 'Record Expense'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function AssignFeeDialog({ onSuccess, classes, feeStructures }: { onSuccess: () => void; classes: AcademicClass[]; feeStructures: FeeStructure[] }) {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<{
        fee_structure_id: string;
        academic_class_id: string;
        due_date: string;
    }>({ fee_structure_id: '', academic_class_id: '', due_date: new Date().toISOString().split('T')[0] });
    const { toast } = useToast();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await billingAPI.assignBulkFees({
                fee_structure_id: formData.fee_structure_id,
                academic_class_id: formData.academic_class_id,
                due_date: formData.due_date
            });
            toast({ title: 'Success', description: 'Fees assigned successfully' });
            setOpen(false);
            setFormData({ fee_structure_id: '', academic_class_id: '', due_date: new Date().toISOString().split('T')[0] });
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to assign fees';
            const msg = message || 'Failed to assign fees';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Users className="h-4 w-4 mr-2" /> Assign Fees</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Fees to Class</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Fee Structure</Label>
                        <Select value={formData.fee_structure_id} onValueChange={(v) => setFormData({ ...formData, fee_structure_id: v })} required>
                            <SelectTrigger><SelectValue placeholder="Select fee structure" /></SelectTrigger>
                            <SelectContent>
                                {feeStructures.map(f => (
                                    <SelectItem key={f.fee_id} value={f.fee_id}>
                                        {f.name} (${f.amount})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Class</Label>
                        <Select value={formData.academic_class_id} onValueChange={(v) => setFormData({ ...formData, academic_class_id: v })} required>
                            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                            <SelectContent>
                                {classes.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Due Date</Label>
                        <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? 'Assigning...' : 'Assign Fees'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
