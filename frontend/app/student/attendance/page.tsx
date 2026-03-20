// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { academicAPI, Attendance } from '@/lib/api';
import { toast } from 'sonner';

export default function AttendancePage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAttendance();
    }, []);

    const loadAttendance = async () => {
        try {
            setLoading(true);
            const data = await academicAPI.getMyAttendance();
            setAttendanceData(data);
        } catch (error) {
            console.error('Failed to load attendance:', error);
            toast.error("Failed to load attendance records.");
        } finally {
            setLoading(false);
        }
    };

    // Derived Stats
    const totalClasses = attendanceData.length;
    const present = attendanceData.filter(a => a.status === 'present').length;
    const absent = attendanceData.filter(a => a.status === 'absent').length;
    const late = attendanceData.filter(a => a.status === 'late').length;
    // Prevent division by zero
    const percentage = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 100;

    // Filter for selected date
    const selectedDateRecords = attendanceData.filter(record => {
        if (!date) return false;
        const recordDate = new Date(record.date);
        return recordDate.toDateString() === date.toDateString();
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Attendance</h1>
                <p className="text-slate-600">Track your class attendance and punctuality records.</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
                    <p className="text-indigo-100 font-medium mb-1">Overall Attendance</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{percentage}%</span>
                    </div>
                    <div className="mt-4 w-full bg-white/20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                </Card>

                <StatsCard
                    label="Present"
                    value={present}
                    icon={CheckCircle}
                    color="text-green-600"
                    bg="bg-green-50"
                    border="border-green-200"
                />
                <StatsCard
                    label="Absent"
                    value={absent}
                    icon={XCircle}
                    color="text-red-600"
                    bg="bg-red-50"
                    border="border-red-200"
                />
                <StatsCard
                    label="Late"
                    value={late}
                    icon={Clock}
                    color="text-orange-600"
                    bg="bg-orange-50"
                    border="border-orange-200"
                />
            </div>

            {/* Calendar & Details Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Calendar */}
                <Card className="p-6 lg:col-span-1">
                    <h3 className="font-semibold text-lg mb-4">Calendar View</h3>
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md border shadow-sm w-full flex justify-center"
                        modifiers={{
                            present: (date) => attendanceData.some(a => new Date(a.date).toDateString() === date.toDateString() && a.status === 'present'),
                            absent: (date) => attendanceData.some(a => new Date(a.date).toDateString() === date.toDateString() && a.status === 'absent'),
                            late: (date) => attendanceData.some(a => new Date(a.date).toDateString() === date.toDateString() && a.status === 'late'),
                        }}
                        modifiersStyles={{
                            present: { color: 'green', fontWeight: 'bold' },
                            absent: { color: 'red', fontWeight: 'bold' },
                            late: { color: 'orange', fontWeight: 'bold' },
                        }}
                    />
                    <div className="mt-6 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div> <span>Present</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-full bg-red-500"></div> <span>Absent</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="h-3 w-3 rounded-full bg-orange-400"></div> <span>Late</span>
                        </div>
                    </div>
                </Card>

                {/* Right Column: Daily Breakdown */}
                <Card className="p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-lg">
                            Attendance for {date?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h3>
                        {/* <Button variant="outline" size="sm">Request Leave</Button> */}
                    </div>

                    <div className="space-y-4">
                        {selectedDateRecords.length > 0 ? (
                            selectedDateRecords.map((record) => (
                                <div key={record.attendance_id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                            {record.subject_name ? record.subject_name.charAt(0) : 'S'}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-slate-800">{record.subject_name || 'Subject'}</h4>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                {record.remarks && <span>Note: {record.remarks}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <StatusBadge status={record.status} />
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <p>No records found for this date.</p>
                                <p className="text-sm mt-1">If this is a school day, you might have been marked present/absent yet.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({
    label,
    value,
    icon: Icon,
    color,
    bg,
    border,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
}) {
    return (
        <Card className={`p-6 ${bg} ${border} shadow-sm border`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className={`text-sm font-medium ${color} opacity-80`}>{label}</p>
                    <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
                </div>
                <Icon className={`h-8 w-8 ${color} opacity-60`} />
            </div>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'present':
            return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Present</Badge>;
        case 'absent':
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Absent</Badge>;
        case 'late':
            return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Late</Badge>;
        case 'excused':
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Excused</Badge>;
        default:
            return <Badge variant="outline">Unknown</Badge>;
    }
}
