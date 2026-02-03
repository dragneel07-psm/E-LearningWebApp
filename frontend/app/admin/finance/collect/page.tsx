'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { billingAPI, academicAPI, Student, StudentFee } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Search, DollarSign, CheckCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function FeeCollectionPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [loading, setLoading] = useState(false);

    // Payment Dialog
    const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [processing, setProcessing] = useState(false);

    // Debounced Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length > 2) {
                searchStudents();
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const searchStudents = async () => {
        setLoading(true);
        try {
            // Need a search endpoint or filter basic list. 
            // Assuming getStudents(query) exists or filtering client side for now if list is small.
            // For robust app, use search query.
            const allStudents = await academicAPI.getStudents();
            const filtered = allStudents.filter(s =>
                s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.last_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setStudents(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = async (student: Student) => {
        setSelectedStudent(student);
        setFees([]); // Clear prev
        try {
            // Need endpoint to get fees for specific student
            // Current list gets ALL fees. I should verify if filtering is supported.
            // If API supports ?student_id=... use that.
            // Assuming tenantScopedViewset, filtering by student would be standard in REST?
            // If not, I might fetch all and filter client side (not ideal for prod)
            // Ideally backend `StudentFeeViewSet` should standard filter fields.
            // Let's try fetching all and filtering for this MVP step or check if I can modify backend quickly?
            // I'll assume standard filtering `?student=ID` works if `filterset_fields` was set.
            // If not, I'll update backend or rely on client filter.
            // Checking `billing/views.py`: `StudentFeeViewSet` uses `TenantScopedQuerysetMixin`.
            // Does it have filter_backends? DefaultRouter usually adds nothing unless configured.
            // I'll fetch ALL and filter client side for Safety in this step, as DB is small.
            const allFees = await billingAPI.getStudentFees();
            const studentFees = allFees.filter(f => {
                // Determine student ID match. f.student might be object or ID depending on serializer.
                // Serializer: `StudentFeeSerializer` likely has `student` as ID or nested?
                // `views.py` has `select_related('student')` so it might be ID in default Serializer unless nested.
                // Let's assume ID match.
                // Actually `views.py` line 44: `queryset.select_related(...)`.
                // Checking `serializers.py` (not visible but usually ModelSerializer).
                // If it returns ID:
                const fStudentId = typeof f.student === 'object' ? (f.student as any).id : f.student;
                return fStudentId && fStudentId.toString() === student.id.toString();
            });
            setFees(studentFees);
        } catch (error) {
            toast.error('Failed to load student fees');
        }
    };

    const handlePayment = async () => {
        if (!selectedFee || !paymentAmount) return;
        setProcessing(true);
        try {
            await billingAPI.recordPayment({
                student: selectedStudent?.id, // Use string ID
                student_fee: selectedFee.student_fee_id,
                amount: parseFloat(paymentAmount),
                method: paymentMethod as any
            });
            toast.success('Payment recorded');
            setSelectedFee(null);
            setPaymentAmount('');
            // Refresh fees
            if (selectedStudent) handleSelectStudent(selectedStudent);
        } catch (error) {
            toast.error('Payment failed');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge className="bg-emerald-500">Paid</Badge>;
            case 'partial': return <Badge className="bg-amber-500">Partial</Badge>;
            case 'pending': return <Badge variant="outline" className="text-slate-500 border-slate-300">Pending</Badge>;
            case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Fee Collection</h1>
                <p className="text-slate-500">Search for a student to view dues and record payments.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Panel */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Find Student</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {loading && <div className="text-center py-4"><Loader2 className="animate-spin inline text-indigo-500" /></div>}

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {students.map(student => (
                                <div
                                    key={student.id}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedStudent?.id === student.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent'}`}
                                    onClick={() => handleSelectStudent(student)}
                                >
                                    <p className="font-medium text-slate-900">{student.first_name} {student.last_name}</p>
                                    <p className="text-xs text-slate-500">{student.email}</p>
                                </div>
                            ))}
                            {!loading && students.length === 0 && searchTerm.length > 2 && (
                                <p className="text-sm text-slate-400 text-center">No students found</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Fees Panel */}
                <Card className="lg:col-span-2 min-h-[500px]">
                    <CardHeader>
                        <CardTitle>
                            {selectedStudent ? `${selectedStudent.first_name}'s Fee Record` : 'Select a student'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedStudent ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <Search className="h-12 w-12 mb-2 opacity-20" />
                                <p>Search and select a student to manage fees.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fee Type</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fees.map(fee => {
                                        const balance = parseFloat((fee.amount_due - fee.amount_paid).toString());
                                        const feeName = typeof fee.fee_structure === 'object' ? (fee.fee_structure as any).name : 'Fee'; // Robustness check

                                        return (
                                            <TableRow key={fee.student_fee_id}>
                                                <TableCell className="font-medium">{feeName}</TableCell>
                                                <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{getStatusBadge(fee.status)}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-700">
                                                    ${balance.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {balance > 0 && (
                                                        <Button size="sm" onClick={() => {
                                                            setSelectedFee(fee);
                                                            setPaymentAmount(balance.toString());
                                                        }}>
                                                            <DollarSign className="h-4 w-4 mr-1" /> Pay
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {fees.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                No assigned fees found for this student.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Payment Dialog */}
            <Dialog open={!!selectedFee} onOpenChange={(o) => !o && setSelectedFee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Enter the payment details below.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedFee && (
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Total Due:</span>
                                <span className="font-bold">${selectedFee.amount_due}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Already Paid:</span>
                                <span className="font-bold">${selectedFee.amount_paid}</span>
                            </div>
                            <div className="border-t pt-2">
                                <Label>Amount to Pay</Label>
                                <Input
                                    className="mt-1.5 font-bold text-lg"
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedFee(null)}>Cancel</Button>
                        <Button onClick={handlePayment} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
