'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DollarSign, Download, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { saasApi, Invoice } from "@/lib/api/saas";
import { toast } from "sonner";

export default function SaasBillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            const data = await saasApi.getInvoices();
            setInvoices(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load invoices.");
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate Stats
    const totalRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const pendingAmount = invoices
        .filter(inv => inv.status === 'pending')
        .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const paidCount = invoices.filter(inv => inv.status === 'paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'pending').length;

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="p-8 space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Billing & Invoices</h2>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue (YTD)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            {pendingCount} invoices pending
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paidCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed/Overdue</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">
                            Requires attention
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                        A list of recent invoices generated for all tenants.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Tenant</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Issued</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((inv) => (
                                    <TableRow key={inv.invoice_id}>
                                        <TableCell className="font-mono text-xs">{inv.invoice_id.slice(0, 8)}</TableCell>
                                        <TableCell className="font-medium">{inv.tenant_name}</TableCell>
                                        <TableCell>${inv.amount}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">{inv.plan_name}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={inv.status === 'paid' ? 'default' : inv.status === 'pending' ? 'secondary' : 'destructive'}
                                                className="capitalize"
                                            >
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(inv.issued_date).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
