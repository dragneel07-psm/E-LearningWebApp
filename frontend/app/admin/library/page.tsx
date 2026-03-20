// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    BookOpen, Users, AlertCircle, Search,
    Plus, RotateCcw, CheckCircle2, MoreVertical
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { libraryAPI, academicAPI, Book, BookIssue, Student } from '@/lib/api';
import { toast } from 'sonner';

export default function LibrarianDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBooks: 0, issuedBooks: 0, overdueBooks: 0 });
    const [books, setBooks] = useState<Book[]>([]);
    const [issues, setIssues] = useState<BookIssue[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('issued');
    const [showIssueDialog, setShowIssueDialog] = useState(false);

    // Issue Dialog Form
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedBook, setSelectedBook] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [booksData, issuesData, studentsData] = await Promise.all([
                libraryAPI.getBooks(),
                libraryAPI.getBookIssues(),
                academicAPI.getStudents() // Admin can fetch all
            ]);

            setBooks(booksData);
            setIssues(issuesData);
            setStudents(studentsData);

            // Calculate Stats
            const issued = issuesData.filter(i => i.status === 'issued' || i.status === 'overdue').length;
            const overdue = issuesData.filter(i => i.status === 'overdue').length;

            setStats({
                totalBooks: booksData.reduce((acc, b) => acc + b.total_copies, 0),
                issuedBooks: issued,
                overdueBooks: overdue
            });

        } catch (error) {
            console.error("Failed to load library data", error);
            toast.error("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    const handleIssueBook = async () => {
        if (!selectedStudent || !selectedBook) {
            toast.error("Please select a student and a book");
            return;
        }

        setSubmitting(true);
        try {
            await libraryAPI.issueBook({
                student: selectedStudent,
                book: selectedBook
            });
            toast.success("Book issued successfully");
            setShowIssueDialog(false);
            setSelectedStudent('');
            setSelectedBook('');
            loadData(); // Refresh
        } catch (error: any) {
            toast.error(error.message || "Failed to issue book");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturnBook = async (issueId: string) => {
        if (!confirm("Are you sure you want to mark this book as returned?")) return;

        try {
            await libraryAPI.returnBook(issueId);
            toast.success("Book returned successfully");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to return book");
        }
    };

    const filteredIssues = issues.filter(issue => {
        const matchesSearch = (issue.book_title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            issue.student_name?.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'issued') {
            return matchesSearch && (issue.status === 'issued' || issue.status === 'overdue');
        } else if (activeTab === 'history') {
            return matchesSearch && issue.status === 'returned';
        } else if (activeTab === 'overdue') {
            return matchesSearch && issue.status === 'overdue';
        }
        return matchesSearch;
    });

    const getStudentName = (id: string) => {
        const s = students.find(s => s.id === id);
        return s ? `${s.first_name} ${s.last_name}` : 'Unknown Student';
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-indigo-600" /> Librarian Dashboard
                    </h1>
                    <p className="text-slate-500">Manage library inventory, issues, and returns</p>
                </div>
                <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Issue Book
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Issue Book</DialogTitle>
                            <DialogDescription>Assign a book to a student. Due date will be set to 14 days from now.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Student</Label>
                                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.first_name} {s.last_name} ({s.student_id || 'No ID'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Book</Label>
                                <Select value={selectedBook} onValueChange={setSelectedBook}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select book..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {books.filter(b => b.available_copies > 0).map(b => (
                                            <SelectItem key={b.book_id} value={b.book_id}>
                                                {b.title} (Available: {b.available_copies})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
                            <Button onClick={handleIssueBook} disabled={submitting}>
                                {submitting ? 'Issuing...' : 'Issue Book'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="shadow-sm border-indigo-100 bg-indigo-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-900">Total Books</CardTitle>
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-900">{stats.totalBooks}</div>
                        <p className="text-xs text-indigo-700 mt-1">{books.length} Unique Titles</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-100 bg-emerald-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">Active Issues</CardTitle>
                        <Users className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">{stats.issuedBooks}</div>
                        <p className="text-xs text-emerald-700 mt-1">Currently with students</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-rose-100 bg-rose-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-rose-900">Overdue Returns</CardTitle>
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-900">{stats.overdueBooks}</div>
                        <p className="text-xs text-rose-700 mt-1">Requires attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Card className="border-slate-200 shadow-sm">
                <Tabs defaultValue="issued" value={activeTab} onValueChange={setActiveTab}>
                    <CardHeader className="border-b border-slate-100 pb-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <TabsList>
                                <TabsTrigger value="issued" className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-900">
                                    Current Issues
                                </TabsTrigger>
                                <TabsTrigger value="overdue" className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-900">
                                    Overdue List
                                </TabsTrigger>
                                <TabsTrigger value="history" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                                    History
                                </TabsTrigger>
                            </TabsList>
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search student or book..."
                                    className="pl-9 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {filteredIssues.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">No records found.</div>
                            ) : (
                                filteredIssues.map(issue => (
                                    <div key={issue.issue_id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={
                                                    issue.status === 'issued' ? 'secondary' :
                                                        issue.status === 'overdue' ? 'destructive' : 'outline'
                                                } className="capitalize">
                                                    {issue.status}
                                                </Badge>
                                                <span className="text-xs text-slate-400 font-mono">#{issue.issue_id.slice(0, 8)}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800">{issue.book_title}</h4>
                                            <p className="text-sm text-slate-500">
                                                Issued to <span className="font-medium text-indigo-600">{issue.student_name}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-6 mt-4 md:mt-0">
                                            <div className="text-right space-y-1">
                                                <p className="text-xs text-slate-400">Due Date</p>
                                                <p className={`text-sm font-medium ${new Date(issue.due_date) < new Date() && issue.status !== 'returned'
                                                    ? 'text-rose-600' : 'text-slate-700'
                                                    }`}>
                                                    {new Date(issue.due_date).toLocaleDateString()}
                                                </p>
                                                {issue.fine_amount > 0 && (
                                                    <p className="text-xs text-rose-600 font-bold">Fine: ${issue.fine_amount}</p>
                                                )}
                                            </div>

                                            {issue.status !== 'returned' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => handleReturnBook(issue.issue_id)}
                                                >
                                                    <RotateCcw className="mr-2 h-3.5 w-3.5" /> Return
                                                </Button>
                                            )}
                                            {issue.status === 'returned' && (
                                                <div className="flex items-center text-emerald-600 text-sm font-medium">
                                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Returned
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}
