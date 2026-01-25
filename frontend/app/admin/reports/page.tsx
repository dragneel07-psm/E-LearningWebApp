'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Table as TableIcon, Download, Loader2, Users, FilePieChart, CreditCard } from 'lucide-react';
import { academicAPI, reportsAPI, Student, AcademicClass } from '@/lib/api';
import { toast } from 'sonner';

type ReportType = 'performance' | 'attendance' | 'fee';

export default function ReportsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    // Selection states
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsData, classesData] = await Promise.all([
                    academicAPI.getStudents(),
                    academicAPI.getClasses()
                ]);
                setStudents(studentsData);
                setClasses(classesData);
            } catch (error) {
                console.error('Error fetching reports data:', error);
                toast.error('Failed to load students and classes');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDownload = async (type: ReportType, format: 'pdf' | 'excel') => {
        let url = '';
        let filename = '';

        if (type === 'performance') {
            if (!selectedStudent) {
                toast.error('Please select a student first');
                return;
            }
            const student = students.find(s => s.id === selectedStudent);
            const name = student ? `${student.last_name}` : 'student';

            url = format === 'pdf'
                ? reportsAPI.getStudentPerformancePDF(selectedStudent)
                : reportsAPI.getStudentPerformanceExcel(selectedStudent);
            filename = `performance_report_${name}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        } else if (type === 'attendance') {
            if (!selectedSection) {
                toast.error('Please select a class section first');
                return;
            }
            url = format === 'pdf'
                ? reportsAPI.getAttendanceSummaryPDF(selectedSection)
                : reportsAPI.getAttendanceSummaryExcel(selectedSection);
            filename = `attendance_summary.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        } else if (type === 'fee') {
            url = format === 'pdf'
                ? reportsAPI.getFeeCollectionPDF()
                : reportsAPI.getFeeCollectionExcel();
            filename = `fee_collection_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        }

        const btnKey = `${type}-${format}`;
        setDownloading(btnKey);
        try {
            // @ts-ignore - helpers is a combined object in api.ts
            await reportsAPI.helpers.downloadFile(url, filename);
            toast.success(`${format.toUpperCase()} report downloaded successfully`);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report');
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-500">Loading reporting tools...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reports Center</h1>
                    <p className="text-slate-500">Generate and download academic and administrative reports</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Student Performance Report */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FilePieChart className="h-5 w-5 text-indigo-600" />
                            Student Performance
                        </CardTitle>
                        <CardDescription>
                            Comprehensive breakdown of assessment scores and growth
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Select Student</label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search student name..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.first_name} {s.last_name} ({s.student_id})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => handleDownload('performance', 'pdf')}
                                disabled={downloading !== null}
                            >
                                {downloading === 'performance-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Download PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => handleDownload('performance', 'excel')}
                                disabled={downloading !== null}
                            >
                                {downloading === 'performance-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableIcon className="h-4 w-4" />}
                                Download Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Attendance Summary Report */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-600" />
                            Attendance Summary
                        </CardTitle>
                        <CardDescription>
                            Aggregated attendance statistics per class section
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Select Class Section</label>
                            <Select value={selectedSection} onValueChange={setSelectedSection}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => (
                                        c.sections?.map(s => (
                                            <SelectItem key={s.id.toString()} value={s.id.toString()}>
                                                {c.name} - Section {s.name}
                                            </SelectItem>
                                        ))
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => handleDownload('attendance', 'pdf')}
                                disabled={downloading !== null}
                            >
                                {downloading === 'attendance-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Download PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => handleDownload('attendance', 'excel')}
                                disabled={downloading !== null}
                            >
                                {downloading === 'attendance-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableIcon className="h-4 w-4" />}
                                Download Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Fee Collection Report */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-amber-600" />
                            Fee Collection
                        </CardTitle>
                        <CardDescription>
                            Summary of all collected fees and recent transactions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Generates a full report of all fee transactions recorded in the system.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => handleDownload('fee', 'pdf')}
                                disabled={downloading !== null}
                            >
                                {downloading === 'fee-pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Download PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => handleDownload('fee', 'excel')}
                                disabled={downloading !== null}
                            >
                                {downloading === 'fee-excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableIcon className="h-4 w-4" />}
                                Download Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
