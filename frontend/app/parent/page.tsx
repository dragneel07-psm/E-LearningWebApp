// app/parent/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, AlertCircle } from 'lucide-react';

export default function ParentDashboard() {
    const children = [
        { id: 1, name: 'Alice', grade: '10th', avgGrade: 'A-' },
        { id: 2, name: 'Bob', grade: '5th', avgGrade: 'B+' },
    ];

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen dark:bg-gray-900">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
                    <p className="text-muted-foreground">Monitor your children&apos;s progress.</p>
                </div>
            </header>

            {/* Children Overview */}
            <div className="grid gap-6 md:grid-cols-2">
                {children.map((child) => (
                    <Card key={child.id} className="border-t-4 border-t-primary">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <User className="h-5 w-5" />
                                    <span>{child.name}</span>
                                </div>
                                <Badge variant="outline">{child.grade}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex justify-between items-center bg-muted p-3 rounded-lg">
                                <span className="font-medium">Average Grade</span>
                                <span className="text-xl font-bold text-primary">{child.avgGrade}</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Attendance</span>
                                    <span className="font-medium">92%</span>
                                </div>
                                <Progress value={92} className="h-2" />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center">
                                    <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                                    Recent Activity
                                </h4>
                                <ul className="text-sm space-y-1 text-muted-foreground">
                                    <li>Completed &quot;Math Assignment 1&quot; (A)</li>
                                    <li>Missed &quot;Science Quiz&quot; (Absent)</li>
                                </ul>
                            </div>

                            <Button className="w-full">View Full Report</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
