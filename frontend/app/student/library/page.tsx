'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, Calendar, User } from 'lucide-react';
import { libraryAPI, academicAPI, usersAPI, Book, BookIssue } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = [
    'fiction', 'non_fiction', 'science', 'mathematics', 'history',
    'literature', 'technology', 'biography', 'reference', 'other'
];

export default function StudentLibraryPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [myIssues, setMyIssues] = useState<BookIssue[]>([]);
    const [studentId, setStudentId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await usersAPI.getMe();
            const students = await academicAPI.getStudents();
            const currentStudent = students.find(s => s.user === user.user_id);

            if (currentStudent) {
                setStudentId(currentStudent.student_id);
                const [booksData, issuesData] = await Promise.all([
                    libraryAPI.getBooks(),
                    libraryAPI.getBookIssues()
                ]);
                setBooks(booksData);
                setMyIssues(issuesData.filter(issue => issue.student === currentStudent.student_id));
            }
        } catch (error) {
            console.error('Failed to load library data:', error);
            toast.error('Failed to load library data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestBook = async (bookId: string) => {
        if (!studentId) {
            toast.error('Student information not found');
            return;
        }

        try {
            await libraryAPI.issueBook({ book: bookId, student: studentId });
            toast.success('Book request submitted successfully');
            loadData();
        } catch (error) {
            console.error('Failed to request book:', error);
            toast.error('Failed to request book');
        }
    };

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const activeIssues = myIssues.filter(issue => issue.status === 'issued');
    const overdueIssues = myIssues.filter(issue => issue.status === 'overdue');

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
                    <BookOpen className="h-8 w-8 text-indigo-600" />
                    Library
                </h1>
                <p className="text-muted-foreground">Browse and request books</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Books Issued</p>
                                <h3 className="text-2xl font-bold mt-2">{activeIssues.length}</h3>
                            </div>
                            <BookOpen className="h-8 w-8 text-blue-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                                <h3 className="text-2xl font-bold mt-2 text-red-600">{overdueIssues.length}</h3>
                            </div>
                            <Calendar className="h-8 w-8 text-red-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Available Books</p>
                                <h3 className="text-2xl font-bold mt-2 text-green-600">
                                    {books.filter(b => b.available_copies > 0).length}
                                </h3>
                            </div>
                            <BookOpen className="h-8 w-8 text-green-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="browse" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="browse">Browse Books</TabsTrigger>
                    <TabsTrigger value="mybooks">My Books ({activeIssues.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="browse" className="space-y-4">
                    {/* Search and Filter */}
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title or author..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat.replace('_', ' ').toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Books Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredBooks.map(book => (
                            <Card key={book.book_id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="mb-4">
                                        <h3 className="font-semibold text-lg mb-1">{book.title}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">by {book.author}</p>
                                        <Badge variant="outline" className="text-xs">
                                            {book.category.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    {book.description && (
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                            {book.description}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {book.available_copies > 0 ? `${book.available_copies} available` : 'Not available'}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleRequestBook(book.book_id)}
                                            disabled={book.available_copies === 0}
                                        >
                                            Request
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filteredBooks.length === 0 && (
                        <div className="text-center py-12">
                            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-muted-foreground">No books found</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="mybooks" className="space-y-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {myIssues.map(issue => (
                                    <div key={issue.issue_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div className="flex-1">
                                            <h4 className="font-semibold">{issue.book_title}</h4>
                                            <p className="text-sm text-muted-foreground">by {issue.book_author}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Issued: {new Date(issue.issued_date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Due: {new Date(issue.due_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant={
                                                issue.status === 'returned' ? 'default' :
                                                    issue.status === 'overdue' ? 'destructive' : 'secondary'
                                            }>
                                                {issue.status}
                                            </Badge>
                                            {issue.fine_amount > 0 && (
                                                <span className="text-sm font-medium text-red-600">
                                                    Fine: ${issue.fine_amount.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {myIssues.length === 0 && (
                                    <div className="text-center py-12">
                                        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                        <p className="text-muted-foreground">No books issued yet</p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Browse the catalog and request books
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
