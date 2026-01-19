'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft, Plus, Search, MoreHorizontal, User as UserIcon, Download,
    Shield, ShieldCheck, ShieldAlert, GraduationCap, X, Mail, Calendar, Edit, Lock, TrendingUp, Printer
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { academicAPI, usersAPI, helpers, Student, AcademicClass, User, Result, Assessment, Course } from '@/lib/api';
import { ChangePasswordDialog } from '@/components/admin/change-password-dialog';



// Helper to generate consistent avatars
const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=e5e7eb`;

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Profile View State
    type StudentResultDetail = Result & {
        assessmentDetails?: Assessment;
        courseDetails?: Course | null;
        percentage?: number;
    };
    const [studentResults, setStudentResults] = useState<StudentResultDetail[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);

    // Dialog State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');

    // Create Form State
    const [newStudent, setNewStudent] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: 'ChangeMe123!', // Default password
        academic_class: '',
    });

    // Password Dialog State
    const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; userName: string }>({
        open: false, userId: '', userName: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [studentsData, classesData] = await Promise.all([
                academicAPI.getStudents(),
                academicAPI.getClasses()
            ]);
            setStudents(studentsData);
            setClasses(classesData);
        } catch (error) {
            console.error('Failed to load students:', error);
        } finally {
            setLoading(false);
        }
    };

    const getClassName = (classId: string | null) => {
        if (!classId) return 'Unassigned';
        const cls = classes.find(c => c.class_id === classId);
        return cls ? `Grade ${cls.grade} - ${cls.section}` : 'Unknown Class';
    };

    const handleExportCSV = () => {
        const headers = ['Student ID', 'First Name', 'Last Name', 'Username', 'Email', 'Class', 'Status'];
        const rows = students.map(s => [
            s.student_id,
            s.first_name || '',
            s.last_name || '',
            s.username || '',
            s.email || '',
            getClassName(s.academic_class),
            s.is_active === false ? 'Suspended' : 'Active'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCreateStudent = async () => {
        if (!newStudent.first_name || !newStudent.last_name || !newStudent.username || !newStudent.email) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            // 1. Create User Account
            const userPayload: Partial<User> & { password?: string } = {
                first_name: newStudent.first_name,
                last_name: newStudent.last_name,
                username: newStudent.username,
                email: newStudent.email,
                role: 'student',
                // password: newStudent.password  // If backend supports setting password on create
            };
            const user = await usersAPI.createAccount(userPayload);

            // 2. Create Student Profile linked to User
            await academicAPI.createStudent({
                user: user.user_id,
                academic_class: newStudent.academic_class || null
            });

            alert('Student created successfully!');
            setDialogOpen(false);
            setNewStudent({
                first_name: '', last_name: '', email: '', username: '', password: 'ChangeMe123!', academic_class: ''
            });
            loadData();
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            alert(`Failed to create student: ${message}`);
        }
    };

    const handleSuspend = async (student: Student) => {
        const action = student.is_active === false ? 'activate' : 'suspend';
        if (!confirm(`Are you sure you want to ${action} this student?`)) return;

        try {
            const newState = student.is_active === false;
            if (student.user) {
                await usersAPI.updateAccount(student.user, { is_active: newState });
            }
            // Optimistic update
            setStudents(students.map(s => s.student_id === student.student_id ? { ...s, is_active: newState } : s));
            alert(`Student ${newState ? 'activated' : 'suspended'} successfully.`);
        } catch (e) {
            console.error(e);
            alert('Failed to update status.');
        }
    };

    const handleSaveStudent = async () => {
        if (!selectedStudent) return;
        try {
            await academicAPI.updateStudent(selectedStudent.student_id, {
                academic_class: selectedStudent.academic_class,
                learning_style: selectedStudent.learning_style
            });
            setDialogOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Failed to update student');
        }
    };

    const handleViewProfile = async (student: Student) => {
        setSelectedStudent(student);
        setDialogMode('view');
        setDialogOpen(true);
        setLoadingResults(true);
        try {
            const results = await helpers.getStudentResultsWithDetails(student.student_id);
            setStudentResults(results);
        } catch (error) {
            console.error("Failed to load student results", error);
            setStudentResults([]);
        } finally {
            setLoadingResults(false);
        }
    };

    const [selectedGrade, setSelectedGrade] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');

    const uniqueGrades = Array.from(new Set(classes.map(c => c.grade))).sort((a, b) => a - b);
    const uniqueSections = Array.from(new Set(classes.map(c => c.section))).sort();

    const handleDownloadReport = () => {
        if (!selectedStudent) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- Header Section ---
        // School Name (Mock)
        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.setFont('helvetica', 'bold');
        doc.text("Luminar School of Excellence", pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFont('helvetica', 'normal');
        doc.text("Official Student Progress Report", pageWidth / 2, 28, { align: 'center' });

        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.line(15, 35, pageWidth - 15, 35);

        // --- Student Profile Section ---
        const startY = 45;
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFont('helvetica', 'bold');
        doc.text("Student Profile", 15, startY);

        // Basic Info Grid
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate-600

        const col1 = 15;
        const col2 = pageWidth / 2 + 10;
        const name = selectedStudent.first_name + ' ' + selectedStudent.last_name || selectedStudent.username;
        const className = getClassName(selectedStudent.academic_class);
        const email = selectedStudent.email || 'N/A';

        // Left Col
        doc.text(`Name:`, col1, startY + 10);
        doc.setFont('helvetica', 'bold');
        doc.text(name || 'Unknown', col1 + 25, startY + 10);

        doc.setFont('helvetica', 'normal');
        doc.text(`Class:`, col1, startY + 18);
        doc.setFont('helvetica', 'bold');
        doc.text(className, col1 + 25, startY + 18);

        // Right Col
        doc.setFont('helvetica', 'normal');
        doc.text(`Email:`, col2, startY + 10);
        doc.setFont('helvetica', 'bold');
        doc.text(email, col2 + 25, startY + 10);

        doc.setFont('helvetica', 'normal');
        doc.text(`Roll No:`, col2, startY + 18);
        doc.setFont('helvetica', 'bold');
        doc.text(selectedStudent.student_id.substring(0, 6).toUpperCase(), col2 + 25, startY + 18);

        // --- Academic Highlights (Stats) ---
        const statsY = startY + 35;
        // Draw 3 boxes
        const boxWidth = (pageWidth - 40) / 3;
        const boxHeight = 25;

        // Function to draw stat box
        const drawStatBox = (x: number, title: string, value: string, color: [number, number, number]) => {
            doc.setFillColor(248, 250, 252); // Slate-50
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, statsY, boxWidth, boxHeight, 3, 3, 'FD');

            doc.setTextColor(100, 116, 139);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(title.toUpperCase(), x + 10, statsY + 10);

            doc.setTextColor(...color);
            doc.setFontSize(14);
            doc.text(value, x + 10, statsY + 20);
        };

        const activeColor: [number, number, number] = selectedStudent.is_active === false ? [220, 38, 38] : [16, 185, 129];
        drawStatBox(15, "Attendance", "94.5%", [79, 70, 229]);
        drawStatBox(15 + boxWidth + 5, "Exam Average", "78%", [37, 99, 235]); // Mock Avg
        drawStatBox(15 + (boxWidth * 2) + 10, "Status", selectedStudent.is_active === false ? "Suspended" : "Active", activeColor);

        // --- Exam Results Table ---
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("Examination Results", 15, statsY + boxHeight + 20);

        const tableBody = studentResults.map(res => [
            res.courseDetails?.subject || 'N/A',
            res.assessmentDetails?.title || 'Assessment',
            `${res.score} / ${res.assessmentDetails?.total_marks || 100}`,
            `${res.percentage}%`,
            (res.percentage ?? 0) >= 90 ? 'A+' : (res.percentage ?? 0) >= 75 ? 'A' : (res.percentage ?? 0) >= 60 ? 'B' : 'C'
        ]);

        autoTable(doc, {
            startY: statsY + boxHeight + 25,
            head: [['Subject', 'Exam Title', 'Score', 'Percentage', 'Grade']],
            body: tableBody.length > 0 ? tableBody : [['No results found', '-', '-', '-', '-']],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 4 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        // --- Performance & Attendance Visuals ---
        const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 0;
        const contentStartY = finalY + 20;

        // Subject-wise Performance Bars
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text("Subject-wise Performance", 15, contentStartY);

        const subjects = [
            { name: "Mathematics", score: 85 },
            { name: "Science", score: 72 },
            { name: "English", score: 90 },
            { name: "Social Studies", score: 65 }
        ];

        let barY = contentStartY + 15;
        subjects.forEach(sub => {
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(sub.name, 15, barY);

            // Draw background bar
            doc.setFillColor(241, 245, 249);
            doc.rect(60, barY - 4, 100, 6, 'F');

            // Draw progress bar
            const width = (sub.score / 100) * 100;
            if (sub.score >= 80) doc.setFillColor(16, 185, 129); // Green
            else if (sub.score >= 60) doc.setFillColor(59, 130, 246); // Blue
            else doc.setFillColor(234, 179, 8); // Yellow

            doc.rect(60, barY - 4, width, 6, 'F');

            // Score text
            doc.setFontSize(9);
            doc.text(`${sub.score}%`, 165, barY);

            barY += 12;
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Generated via Smart School Admin • " + new Date().toLocaleDateString(), pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });

        doc.save(`Student_Report_${selectedStudent.student_id}.pdf`);
    };

    const filteredStudents = students.filter(student => {
        const matchesSearch = (student.first_name + ' ' + student.last_name + ' ' + student.username).toLowerCase().includes(searchTerm.toLowerCase());

        const studentClass = classes.find(c => c.class_id === student.academic_class);

        // Filter by Grade
        if (selectedGrade !== 'all') {
            if (!studentClass || studentClass.grade.toString() !== selectedGrade.toString()) return false;
        }

        // Filter by Section
        if (selectedSection !== 'all') {
            if (!studentClass || studentClass.section !== selectedSection) return false;
        }

        return matchesSearch;
    });

    return (
        <div className="p-6 space-y-6 bg-slate-50 min-h-screen dark:bg-slate-900 font-sans">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sidebar-border/10 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/academic">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Student Management</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage enrollments, track progress, and filter by class.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleExportCSV} className="shadow-sm border-slate-200 dark:border-slate-700">
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button
                        onClick={() => {
                            setNewStudent({ first_name: '', last_name: '', email: '', username: '', password: 'ChangeMe123!', academic_class: '' });
                            setDialogMode('create');
                            setDialogOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Student
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, email, or username..."
                        className="pl-10 bg-slate-50 dark:bg-slate-900 border-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                        className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                        value={selectedGrade}
                        onChange={(e) => setSelectedGrade(e.target.value)}
                    >
                        <option value="all">All Grades</option>
                        {uniqueGrades.map(g => (
                            <option key={g} value={g}>Grade {g}</option>
                        ))}
                    </select>

                    <select
                        className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                    >
                        <option value="all">All Sections</option>
                        {uniqueSections.map(s => (
                            <option key={s} value={s}>Section {s}</option>
                        ))}
                    </select>

                    <Button
                        variant="ghost"
                        size="icon"
                        title="Clear Filters"
                        onClick={() => { setSelectedGrade('all'); setSelectedSection('all'); setSearchTerm(''); }}
                        className="text-slate-400 hover:text-red-500"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Students Table */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                            <p>Loading student records...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Avatar</TableHead>
                                    <TableHead>Student Info</TableHead>
                                    <TableHead>Class / Section</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Learning Style</TableHead>
                                    <TableHead className="text-right pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                            No students found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <TableRow key={student.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            <TableCell>
                                                <img
                                                    src={getAvatarUrl(student.username || student.student_id)}
                                                    alt="Avatar"
                                                    className="h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                        {student.first_name || student.last_name
                                                            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                                                            : 'Unknown Name'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{student.email || student.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium bg-slate-100 text-slate-700 border-slate-200">
                                                    {getClassName(student.academic_class)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {student.is_active === false ? (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 shadow-none">Suspended</Badge>
                                                ) : (
                                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 shadow-none">Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="capitalize text-sm text-slate-600">{student.learning_style || '-'}</TableCell>
                                            <TableCell className="text-right lg:pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 hover:text-indigo-600">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-slate-200 shadow-xl">
                                                        <DropdownMenuLabel className="text-xs text-slate-500 font-normal ml-2">Manage Student</DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => handleViewProfile(student)}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <UserIcon className="mr-2 h-4 w-4" /> View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => { setSelectedStudent(student); setDialogMode('edit'); setDialogOpen(true); }}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setPasswordDialog({
                                                                open: true,
                                                                userId: student.user,
                                                                userName: `${student.first_name || ''} ${student.last_name || ''}`
                                                            })}
                                                            className="rounded-lg cursor-pointer focus:bg-indigo-50 focus:text-indigo-600"
                                                        >
                                                            <Lock className="mr-2 h-4 w-4" /> Change Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                                        <DropdownMenuItem
                                                            onClick={() => handleSuspend(student)}
                                                            className={student.is_active === false ? "text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 rounded-lg cursor-pointer" : "text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer"}
                                                        >
                                                            {student.is_active === false ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                                                            {student.is_active === false ? 'Activate Account' : 'Suspend Account'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>


            {/* Dialog (View/Edit/Create) */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all duration-200">
                    <Card className="w-full max-w-2xl max-h-[95vh] flex flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border-0 rounded-2xl ring-1 ring-slate-900/5">

                        {/* Banner & Header */}
                        <div className="h-32 shrink-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDialogOpen(false)}
                                className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-6 relative">
                            <div className="flex justify-between items-end -mt-12 mb-6">
                                <div className="flex items-end">
                                    <img
                                        src={getAvatarUrl(dialogMode === 'create' ? newStudent.username || 'new' : selectedStudent?.username || '')}
                                        className="h-24 w-24 rounded-full border-4 border-white dark:border-slate-900 shadow-lg bg-white"
                                        alt="Profile"
                                    />
                                    <div className="ml-4 mb-1">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                            {dialogMode === 'create' ? 'New Student' : `${selectedStudent?.first_name || ''} ${selectedStudent?.last_name || ''}`}
                                        </h2>
                                        <div className="flex items-center text-slate-500 text-sm">
                                            {dialogMode !== 'create' && <><Mail className="h-3 w-3 mr-1" /> {selectedStudent?.email || 'No email'}</>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="p-0 space-y-6">
                                {dialogMode === 'create' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">First Name *</label>
                                            <Input
                                                value={newStudent.first_name}
                                                onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                                                placeholder="John"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Last Name *</label>
                                            <Input
                                                value={newStudent.last_name}
                                                onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                                                placeholder="Doe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Username *</label>
                                            <Input
                                                value={newStudent.username}
                                                onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                                                placeholder="johndoe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Email *</label>
                                            <Input
                                                type="email"
                                                value={newStudent.email}
                                                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                                placeholder="john@school.edu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Assigned Class *</label>
                                            <select
                                                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={newStudent.academic_class}
                                                onChange={(e) => setNewStudent({ ...newStudent, academic_class: e.target.value })}
                                            >
                                                <option value="">Select Class</option>
                                                {classes.map(c => (
                                                    <option key={c.class_id} value={c.class_id}>Grade {c.grade} - {c.section}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Default Password</label>
                                            <Input
                                                disabled
                                                value={newStudent.password}
                                                className="bg-slate-50 text-slate-500"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Top Stats Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-indigo-50 p-4 rounded-xl flex items-center space-x-4">
                                                <div className="bg-indigo-100 p-2 rounded-lg">
                                                    <GraduationCap className="h-6 w-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Class</p>
                                                    <p className="text-lg font-bold text-slate-800">{getClassName(selectedStudent?.academic_class || null)}</p>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-50 p-4 rounded-xl flex items-center space-x-4">
                                                <div className="bg-emerald-100 p-2 rounded-lg">
                                                    <Calendar className="h-6 w-6 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Attendance</p>
                                                    <p className="text-lg font-bold text-slate-800">94.5%</p>
                                                </div>
                                            </div>
                                            <div className="bg-amber-50 p-4 rounded-xl flex items-center space-x-4">
                                                <div className="bg-amber-100 p-2 rounded-lg">
                                                    <Shield className="h-6 w-6 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Status</p>
                                                    <p className={`text-lg font-bold ${selectedStudent?.is_active === false ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {selectedStudent?.is_active === false ? 'Suspended' : 'Active'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Progress Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center mt-4">
                                                <TrendingUp className="h-4 w-4 mr-2" /> Academic Progress
                                            </h3>

                                            {/* Subject Performance */}
                                            <Card className="border-slate-100 shadow-sm">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-slate-700">Recent Exam Results</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {loadingResults ? (
                                                        <div className="text-center py-4 text-slate-400">Loading results...</div>
                                                    ) : studentResults.length > 0 ? (
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="hover:bg-transparent">
                                                                    <TableHead className="h-8 text-xs">Subject</TableHead>
                                                                    <TableHead className="h-8 text-xs">Exam</TableHead>
                                                                    <TableHead className="h-8 text-xs text-right">Score</TableHead>
                                                                    <TableHead className="h-8 text-xs text-right">Grade</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {studentResults.slice(0, 5).map((res, idx) => (
                                                                    <TableRow key={idx} className="border-b-0 hover:bg-slate-50">
                                                                        <TableCell className="py-2 text-xs font-medium">{res.courseDetails?.subject || 'General'}</TableCell>
                                                                        <TableCell className="py-2 text-xs text-slate-500">{res.assessmentDetails?.title || 'Unknown Exam'}</TableCell>
                                                                        <TableCell className="py-2 text-xs text-right font-bold text-slate-700">
                                                                            {res.score} / {res.assessmentDetails?.total_marks || 100}
                                                                        </TableCell>
                                                                        <TableCell className="py-2 text-xs text-right">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                                                                    {(res.percentage ?? 0) >= 90 ? 'bg-green-100 text-green-700' :
                                                                                    (res.percentage ?? 0) >= 75 ? 'bg-blue-100 text-blue-700' :
                                                                                        (res.percentage ?? 0) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                                            'bg-red-100 text-red-700'}`}>
                                                                                {res.percentage ?? 0}%
                                                                            </span>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    ) : (
                                                        <div className="text-center py-6 text-slate-400 text-sm italic">
                                                            No exam results found for this student yet.
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Attendance Graph (Mock) */}
                                            <Card className="border-slate-100 shadow-sm">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-slate-700">Subject-wise Attendance</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {[
                                                            { subject: 'Mathematics', percent: 98, color: 'bg-indigo-500' },
                                                            { subject: 'Physics', percent: 85, color: 'bg-blue-500' },
                                                            { subject: 'Chemistry', percent: 92, color: 'bg-emerald-500' },
                                                            { subject: 'English', percent: 100, color: 'bg-purple-500' },
                                                        ].map((item, i) => (
                                                            <div key={i} className="space-y-1">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="font-medium text-slate-600">{item.subject}</span>
                                                                    <span className="text-slate-500">{item.percent}%</span>
                                                                </div>
                                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${item.color}`}
                                                                        style={{ width: `${item.percent}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {/* Footer Actions */}
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between gap-3">
                                <div>
                                    {dialogMode === 'view' && (
                                        <Button variant="outline" onClick={handleDownloadReport} className="text-slate-600 hover:text-indigo-600 border-slate-300">
                                            <Printer className="h-4 w-4 mr-2" /> Download Report
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" className="hover:bg-slate-100" onClick={() => setDialogOpen(false)}>
                                        {dialogMode === 'view' ? 'Close' : 'Cancel'}
                                    </Button>
                                    {dialogMode === 'create' && (
                                        <Button onClick={handleCreateStudent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">Create Student</Button>
                                    )}
                                    {dialogMode === 'edit' && (
                                        <Button onClick={handleSaveStudent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">Save Changes</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
            {/* Password Dialog */}
            <ChangePasswordDialog
                open={passwordDialog.open}
                onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}
                userId={passwordDialog.userId}
                userName={passwordDialog.userName}
            />
        </div>
    );
}


