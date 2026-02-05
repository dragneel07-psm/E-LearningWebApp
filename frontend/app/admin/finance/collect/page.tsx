'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { billingAPI, academicAPI, Student, StudentFee, Payment, FeeStructure } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Plus, Loader2, DollarSign, User, Calendar, CreditCard, Receipt, Filter } from 'lucide-react';

export default function PaymentCollectionPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [pendingFees, setPendingFees] = useState<StudentFee[]>([]);
    const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Payment Form
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
    const [paymentData, setPaymentData] = useState<Partial<Payment>>({
        amount: 0,
        method: 'cash',
        remarks: '',
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const studentsData = await academicAPI.getStudents();
            setStudents(studentsData);
            const paymentsData = await billingAPI.getPayments();
            setRecentPayments(paymentsData.slice(0, 10));
        } catch (error) {
            console.error(error);
            toast.error('Failed to load initial data');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setLoading(true);
        try {
            const results = await academicAPI.getStudents(); // Simplified: searching local list for now
            const found = results.filter(s =>
                s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setStudents(found);
        } catch (error) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = async (student: Student) => {
        setSelectedStudent(student);
        setLoading(true);
        try {
            const allFees = await billingAPI.getStudentFees();
            const studentFees = allFees.filter(f => f.student === student.id && f.status !== 'paid');
            setPendingFees(studentFees);
        } catch (error) {
            toast.error('Failed to load student fees');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayment = (fee: StudentFee) => {
        setSelectedFee(fee);
        setPaymentData({
            amount: fee.amount_due - fee.amount_paid,
            method: 'cash',
            remarks: `Payment for ${fee.fee_name || 'Fee'}`,
        });
        setIsPaymentDialogOpen(true);
    };

    const handleRecordPayment = async () => {
        if (!selectedStudent || !paymentData.amount || paymentData.amount <= 0) {
            toast.error('Invalid payment amount');
            return;
        }

        try {
            await billingAPI.recordPayment({
                ...paymentData,
                student: selectedStudent.id,
                student_fee: selectedFee?.student_fee_id || null,
                payment_date: new Date().toISOString(),
            });
            toast.success('Payment recorded successfully');
            setIsPaymentDialogOpen(false);
            if (selectedStudent) handleSelectStudent(selectedStudent);
            loadInitialData(); // Refresh recent payments
        } catch (error) {
            console.error(error);
            toast.error('Failed to record payment');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <header>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Receipt className="h-8 w-8 text-indigo-600" /> Collect Payments
                </h1>
                <p className="text-slate-500">Search students and record manual fee payments.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Sidebar */}
                <Card className="lg:col-span-1 border-0 shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg">Student Search</CardTitle>
                        <div className="flex gap-2 mt-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Name or Email..."
                                    className="pl-9 h-10 border-slate-200"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <Button size="icon" className="h-10 w-10 bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={handleSearch}>
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto px-6 pb-6 space-y-2">
                            {students.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => handleSelectStudent(student)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${selectedStudent?.id === student.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                        {student.first_name[0]}{student.last_name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 truncate">{student.first_name} {student.last_name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{student.email}</p>
                                    </div>
                                    <User className={`h-4 w-4 ${selectedStudent?.id === student.id ? 'text-indigo-600' : 'text-slate-300'}`} />
                                </div>
                            ))}
                            {students.length === 0 && !loading && (
                                <p className="text-center py-4 text-sm text-slate-400">No students found.</p>
                            )}
                            {loading && <div className="py-4 flex justify-center"><Loader2 className="animate-spin h-5 w-5 text-indigo-500" /></div>}
                        </div>
                    </CardContent>
                </Card>

                {/* Patient Details & Action Area */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedStudent ? (
                        <>
                            <Card className="border-0 shadow-sm bg-indigo-600 text-white">
                                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                            <User className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black">{selectedStudent.first_name} {selectedStudent.last_name}</h2>
                                            <p className="text-indigo-100 font-medium">Class: {selectedStudent.academic_class || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-indigo-100 text-sm opacity-80 uppercase tracking-widest font-bold">Total Pending</p>
                                        <p className="text-3xl font-black">
                                            ${pendingFees.reduce((acc, f) => acc + (f.amount_due - f.amount_paid), 0).toLocaleString()}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg">Outstanding Dues</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold tracking-wider">
                                            <TableRow>
                                                <TableHead className="pl-6">Fee Description</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Balance</TableHead>
                                                <TableHead className="text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingFees.map(fee => (
                                                <TableRow key={fee.student_fee_id}>
                                                    <TableCell className="pl-6 font-bold">{fee.fee_name || 'Regular Fee'}</TableCell>
                                                    <TableCell className="text-sm font-medium text-slate-500">{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium">${fee.amount_due}</TableCell>
                                                    <TableCell className="font-black text-rose-600">${fee.amount_due - fee.amount_paid}</TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleOpenPayment(fee)}>
                                                            Record
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {pendingFees.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 font-medium">
                                                        No pending fees for this student.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="border-0 border-dashed border-2 bg-slate-50 h-full flex flex-col items-center justify-center p-12 text-center">
                            <Receipt className="h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-600">No Student Selected</h3>
                            <p className="text-slate-400 max-w-sm mt-2">Find a student using the search sidebar to view their fee status and record payments.</p>
                        </Card>
                    )}

                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Collections</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableBody>
                                    {recentPayments.map(payment => (
                                        <TableRow key={payment.payment_id}>
                                            <TableCell className="pl-6">
                                                <div className="font-bold text-slate-900">{payment.student_name}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase">{payment.method}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right pr-6 font-black text-emerald-600">
                                                +${payment.amount}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {recentPayments.length === 0 && (
                                        <TableRow>
                                            <TableCell className="text-center py-8 text-slate-400">No recent transactions.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[450px] border-0 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <CreditCard className="h-6 w-6 text-emerald-600" /> Record Payment
                        </DialogTitle>
                        <DialogDescription>
                            Recording payment for {selectedStudent?.first_name} {selectedStudent?.last_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Amount to Record</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                                    className="pl-9 text-lg font-black border-slate-200 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Payment Method</Label>
                            <Select value={paymentData.method} onValueChange={v => setPaymentData({ ...paymentData, method: v as any })}>
                                <SelectTrigger className="border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="card">Card Payment</SelectItem>
                                    <SelectItem value="online">Online Payment</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Remarks</Label>
                            <Input
                                value={paymentData.remarks}
                                onChange={e => setPaymentData({ ...paymentData, remarks: e.target.value })}
                                placeholder="Any internal notes..."
                                className="border-slate-200"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="border-slate-200">Cancel</Button>
                        <Button onClick={handleRecordPayment} className="bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold px-8 shadow-md">
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
