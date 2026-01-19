'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SaasAuditPage() {
    return (
        <div className="p-8 space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>

            <Card>
                <CardHeader>
                    <CardTitle>System Activities</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action Type</TableHead>
                                <TableHead>Admin User</TableHead>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Affected Entity</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-mono text-xs">PLAN_UPDATE</TableCell>
                                <TableCell>superadmin</TableCell>
                                <TableCell>Jan 16, 2026 10:45 AM</TableCell>
                                <TableCell>Basic Plan</TableCell>
                                <TableCell>Increased student limit from 50 to 100.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-mono text-xs">TENANT_SUSPEND</TableCell>
                                <TableCell>superadmin</TableCell>
                                <TableCell>Jan 15, 2026 02:30 PM</TableCell>
                                <TableCell>Old Town School</TableCell>
                                <TableCell>Suspended due to non-payment.</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-mono text-xs">CONFIG_CHANGE</TableCell>
                                <TableCell>superadmin</TableCell>
                                <TableCell>Jan 14, 2026 09:15 AM</TableCell>
                                <TableCell>System</TableCell>
                                <TableCell>Updated default branding colors.</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
