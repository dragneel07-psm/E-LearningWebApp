'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit } from "lucide-react";

export default function SaasAiUsagePage() {
    return (
        <div className="p-8 space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">AI Usage & Cost Control</h2>

            {/* OVERVIEW CARDS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Tokens Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-purple-500" />
                            2,450,120
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Estimated Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">$49.00</div>
                        <p className="text-xs text-slate-500">Based on $0.02 / 1k tokens</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Avg Cost / Student</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0.005</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Highest Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold truncate">Tech High School</div>
                        <p className="text-xs text-red-500">850k tokens this month</p>
                    </CardContent>
                </Card>
            </div>

            {/* USAGE TABLE */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage by School</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>School Name</TableHead>
                                <TableHead>Plan Limit</TableHead>
                                <TableHead>Tokens Used</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead>Cost Est.</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">Tech High School</TableCell>
                                <TableCell>1,000,000</TableCell>
                                <TableCell>850,000</TableCell>
                                <TableCell>150,000</TableCell>
                                <TableCell>$17.00</TableCell>
                                <TableCell><Badge className="bg-yellow-500">Warning</Badge></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Greenwood High</TableCell>
                                <TableCell>200,000</TableCell>
                                <TableCell>45,000</TableCell>
                                <TableCell>155,000</TableCell>
                                <TableCell>$0.90</TableCell>
                                <TableCell><Badge variant="outline" className="text-green-600 border-green-600">Normal</Badge></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-medium">Sunrise Academy</TableCell>
                                <TableCell>50,000</TableCell>
                                <TableCell>48,500</TableCell>
                                <TableCell className="text-red-500 font-bold">1,500</TableCell>
                                <TableCell>$0.97</TableCell>
                                <TableCell><Badge variant="destructive">Critical</Badge></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
