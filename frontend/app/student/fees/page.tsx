'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, DollarSign, Calendar, History, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { billingAPI, academicAPI, usersAPI, StudentFee, Payment } from '@/lib/api';
import { toast } from 'sonner';

export default function StudentFeesPage() {
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await usersAPI.getMe();
            const students = await academicAPI.getStudents();
            const currentStudent = students.find(s => s.user_id === user.user_id);

            if (currentStudent) {
                const [feesData, paymentsData] = await Promise.all([
                    billingAPI.getStudentFees(),
                    billingAPI.getPayments()
                ]);

                // Filter for current student
                const myFees = feesData.filter(f => f.student === currentStudent.id);
                const myPayments = paymentsData.filter(p => p.student === currentStudent.id);

                setFees(myFees);
                setPayments(myPayments);
            }
        } catch (error) {
            console.error('Failed to load fee data:', error);
            toast.error('Failed to load fee data');
        } finally {
            setLoading(false);
        }
    };

    const totalDue = fees.reduce((sum, f) => sum + parseFloat(f.amount_due.toString()), 0);
    const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.amount_paid.toString()), 0);
    const pendingAmount = totalDue - totalPaid;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Wallet className="h-8 w-8 text-indigo-600" />
                    Fees & Payments
                </h1>
                <p className="text-muted-foreground">Manage your school fees and view payment history</p>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-indigo-600 text-white border-0 shadow-lg shadow-indigo-100">
                    <CardContent className="p-6">
                        <p className="text-indigo-100 text-sm font-medium">Total Fees</p>
                        <div className="flex items-center justify-between mt-2">
                            <h3 className="text-3xl font-bold">${totalDue.toLocaleString()}</h3>
                            <CreditCard className="h-8 w-8 opacity-40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-100">
                    <CardContent className="p-6">
                        <p className="text-emerald-100 text-sm font-medium">Total Paid</p>
                        <div className="flex items-center justify-between mt-2">
                            <h3 className="text-3xl font-bold">${totalPaid.toLocaleString()}</h3>
                            <CheckCircle2 className="h-8 w-8 opacity-40" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={`text-white border-0 shadow-lg ${pendingAmount > 0 ? 'bg-amber-500 shadow-amber-100' : 'bg-slate-800 shadow-slate-100'}`}>
                    <CardContent className="p-6">
                        <p className={`${pendingAmount > 0 ? 'text-amber-50 origin-left' : 'text-slate-400'} text-sm font-medium`}>Outstanding Balance</p>
                        <div className="flex items-center justify-between mt-2">
                            <h3 className="text-3xl font-bold">${pendingAmount.toLocaleString()}</h3>
                            <AlertCircle className="h-8 w-8 opacity-40" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="dues" className="space-y-4">
                <TabsList className="bg-white border p-1 rounded-xl w-full md:w-auto h-auto">
                    <TabsTrigger value="dues" className="rounded-lg px-6 py-2 content-center gap-2">
                        <DollarSign className="h-4 w-4" /> Outstanding Dues
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg px-6 py-2 content-center gap-2">
                        <History className="h-4 w-4" /> Payment History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dues" className="space-y-4">
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg">Invoices & Fees</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="px-6 py-4">Fee Structure</th>
                                            <th className="px-6 py-4">Due Date</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Paid</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {fees.map((fee) => (
                                            <tr key={fee.student_fee_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{fee.fee_name || 'School Fee'}</div>
                                                    <div className="text-xs text-slate-500">Invoice ID: {fee.student_fee_id.substring(0, 8)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(fee.due_date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900">${fee.amount_due}</td>
                                                <td className="px-6 py-4 text-emerald-600 font-medium">${fee.amount_paid}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={
                                                        fee.status === 'paid' ? 'default' :
                                                            fee.status === 'partial' ? 'secondary' : 'destructive'
                                                    } className="capitalize">
                                                        {fee.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {fee.status !== 'paid' && (
                                                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Pay Now</Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {fees.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    No fee records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-lg">Recent Payments</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b">
                                        <tr>
                                            <th className="px-6 py-4">Transaction Details</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Method</th>
                                            <th className="px-6 py-4">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {payments.map((payment) => (
                                            <tr key={payment.payment_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">Payment for {payment.student_name}</div>
                                                    <div className="text-xs text-slate-500">TXID: {payment.transaction_id || payment.payment_id.substring(0, 12)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-600">
                                                        {new Date(payment.payment_date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-600">${payment.amount}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className="capitalize">{payment.method}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                                        Download
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {payments.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    No payment history available.
                                                </td>
                                            </tr>
                                        )}
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
