'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Edit, Trash2, Search, BookMarked, Users } from 'lucide-react';
import { libraryAPI, academicAPI, Book, BookIssue, Student } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = [
    'fiction', 'non_fiction', 'science', 'mathematics', 'history',
    'literature', 'technology', 'biography', 'reference', 'other'
];

export default function AdminLibraryPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [issues, setIssues] = useState<BookIssue[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Dialogs
    const [addBookOpen, setAddBookOpen] = useState(false);
    const [editBookOpen, setEditBookOpen] = useState(false);
    const [issueBookOpen, setIssueBookOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);

    // Form states
    const [bookForm, setBookForm] = useState({
        title: '',
        author: '',
        isbn: '',
        category: 'fiction',
        publisher: '',
        published_year: '',
        total_copies: '1',
        description: '',
        cover_image: ''
    });

    const [issueForm, setIssueForm] = useState({
        book: '',
        student: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [booksData, issuesData, studentsData] = await Promise.all([
                libraryAPI.getBooks(),
                libraryAPI.getBookIssues(),
                academicAPI.getStudents()
            ]);
            setBooks(booksData);
            setIssues(issuesData);
            setStudents(studentsData);
        } catch (error) {
            console.error('Failed to load library data:', error);
            toast.error('Failed to load library data');
        } finally {
            setLoading(false);
        }
    };

    const validateBookForm = () => {
        if (!bookForm.title.trim()) {
            toast.error('Title is required');
            return false;
        }
        if (!bookForm.author.trim()) {
            toast.error('Author is required');
            return false;
        }
        const totalCopies = parseInt(bookForm.total_copies);
        if (isNaN(totalCopies) || totalCopies < 1) {
            toast.error('Total copies must be at least 1');
            return false;
        }
        const year = bookForm.published_year ? parseInt(bookForm.published_year) : null;
        if (year && (year < 1000 || year > 2100)) {
            toast.error('Published year must be between 1000 and 2100');
            return false;
        }
        return true;
    };

    const handleAddBook = async () => {
        if (!validateBookForm()) return;

        setSubmitting(true);
        try {
            await libraryAPI.createBook({
                ...bookForm,
                published_year: bookForm.published_year ? parseInt(bookForm.published_year) : undefined,
                total_copies: parseInt(bookForm.total_copies)
                // available_copies is auto-set by backend
            });
            toast.success('Book added successfully');
            setAddBookOpen(false);
            resetBookForm();
            loadData();
        } catch (error: unknown) {
            console.error('Failed to add book:', error);
            const message = error instanceof Error ? error.message : 'Failed to add book';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditBook = async () => {
        if (!selectedBook) return;
        if (!validateBookForm()) return;

        setSubmitting(true);
        try {
            await libraryAPI.updateBook(selectedBook.book_id, {
                ...bookForm,
                published_year: bookForm.published_year ? parseInt(bookForm.published_year) : undefined,
                total_copies: parseInt(bookForm.total_copies)
            });
            toast.success('Book updated successfully');
            setEditBookOpen(false);
            resetBookForm();
            loadData();
        } catch (error: unknown) {
            console.error('Failed to update book:', error);
            const message = error instanceof Error ? error.message : 'Failed to update book';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (!confirm('Are you sure you want to delete this book?')) return;

        try {
            await libraryAPI.deleteBook(bookId);
            toast.success('Book deleted successfully');
            loadData();
        } catch (error) {
            console.error('Failed to delete book:', error);
            toast.error('Failed to delete book');
        }
    };

    const handleIssueBook = async () => {
        if (!issueForm.book) {
            toast.error('Please select a book');
            return;
        }
        if (!issueForm.student) {
            toast.error('Please select a student');
            return;
        }

        setSubmitting(true);
        try {
            await libraryAPI.issueBook(issueForm);
            toast.success('Book issued successfully');
            setIssueBookOpen(false);
            setIssueForm({ book: '', student: '' });
            loadData();
        } catch (error: unknown) {
            console.error('Failed to issue book:', error);
            const message = error instanceof Error ? error.message : 'Failed to issue book';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturnBook = async (issueId: string) => {
        setSubmitting(true);
        try {
            await libraryAPI.returnBook(issueId);
            toast.success('Book returned successfully');
            loadData();
        } catch (error: unknown) {
            console.error('Failed to return book:', error);
            const message = error instanceof Error ? error.message : 'Failed to return book';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const openEditDialog = (book: Book) => {
        setSelectedBook(book);
        setBookForm({
            title: book.title,
            author: book.author,
            isbn: book.isbn || '',
            category: book.category,
            publisher: book.publisher || '',
            published_year: book.published_year?.toString() || '',
            total_copies: book.total_copies.toString(),
            description: book.description || '',
            cover_image: book.cover_image || ''
        });
        setEditBookOpen(true);
    };

    const resetBookForm = () => {
        setBookForm({
            title: '',
            author: '',
            isbn: '',
            category: 'fiction',
            publisher: '',
            published_year: '',
            total_copies: '1',
            description: '',
            cover_image: ''
        });
        setSelectedBook(null);
    };

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const activeIssues = issues.filter(issue => issue.status === 'issued');
    const overdueIssues = issues.filter(issue => issue.status === 'overdue');

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-8 w-8 text-indigo-600" />
                        Library Management
                    </h1>
                    <p className="text-muted-foreground">Manage books and track issues</p>
                </div>
                <Button onClick={() => setAddBookOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Book
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                                <h3 className="text-2xl font-bold mt-2">{books.length}</h3>
                            </div>
                            <BookOpen className="h-8 w-8 text-indigo-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Available</p>
                                <h3 className="text-2xl font-bold mt-2 text-green-600">
                                    {books.reduce((sum, book) => sum + book.available_copies, 0)}
                                </h3>
                            </div>
                            <BookMarked className="h-8 w-8 text-green-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Issued</p>
                                <h3 className="text-2xl font-bold mt-2 text-blue-600">{activeIssues.length}</h3>
                            </div>
                            <Users className="h-8 w-8 text-blue-600 opacity-20" />
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
                            <BookOpen className="h-8 w-8 text-red-600 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="books" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="books">Books Catalog</TabsTrigger>
                    <TabsTrigger value="issues">Issued Books</TabsTrigger>
                </TabsList>

                <TabsContent value="books" className="space-y-4">
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
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-1">{book.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-2">by {book.author}</p>
                                            <Badge variant="outline" className="text-xs">
                                                {book.category.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Copies:</span>
                                            <span className="font-medium">{book.total_copies}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Available:</span>
                                            <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {book.available_copies}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditDialog(book)}
                                            className="flex-1"
                                        >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteBook(book.book_id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="issues" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setIssueBookOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Issue Book
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {issues.map(issue => (
                                    <div key={issue.issue_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div className="flex-1">
                                            <h4 className="font-semibold">{issue.book_title}</h4>
                                            <p className="text-sm text-muted-foreground">by {issue.book_author}</p>
                                            <p className="text-sm mt-1">Student: {issue.student_name}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>Issued: {new Date(issue.issued_date).toLocaleDateString()}</span>
                                                <span>Due: {new Date(issue.due_date).toLocaleDateString()}</span>
                                                {issue.return_date && (
                                                    <span>Returned: {new Date(issue.return_date).toLocaleDateString()}</span>
                                                )}
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
                                            {issue.status === 'issued' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleReturnBook(issue.issue_id)}
                                                    disabled={submitting}
                                                >
                                                    {submitting ? 'Returning...' : 'Return Book'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {issues.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No book issues yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add Book Dialog */}
            <Dialog open={addBookOpen} onOpenChange={setAddBookOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Book</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={bookForm.title}
                                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="author">Author *</Label>
                            <Input
                                id="author"
                                value={bookForm.author}
                                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="isbn">ISBN</Label>
                            <Input
                                id="isbn"
                                value={bookForm.isbn}
                                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <Select value={bookForm.category} onValueChange={(v) => setBookForm({ ...bookForm, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat.replace('_', ' ').toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="publisher">Publisher</Label>
                            <Input
                                id="publisher"
                                value={bookForm.publisher}
                                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Published Year</Label>
                            <Input
                                id="year"
                                type="number"
                                value={bookForm.published_year}
                                onChange={(e) => setBookForm({ ...bookForm, published_year: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="copies">Total Copies *</Label>
                            <Input
                                id="copies"
                                type="number"
                                min="1"
                                value={bookForm.total_copies}
                                onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cover">Cover Image URL</Label>
                            <Input
                                id="cover"
                                value={bookForm.cover_image}
                                onChange={(e) => setBookForm({ ...bookForm, cover_image: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={bookForm.description}
                                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setAddBookOpen(false); resetBookForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddBook} disabled={submitting}>
                            {submitting ? 'Adding...' : 'Add Book'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Book Dialog */}
            <Dialog open={editBookOpen} onOpenChange={setEditBookOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Book</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {/* Same form fields as Add Book */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">Title *</Label>
                            <Input
                                id="edit-title"
                                value={bookForm.title}
                                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-author">Author *</Label>
                            <Input
                                id="edit-author"
                                value={bookForm.author}
                                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-isbn">ISBN</Label>
                            <Input
                                id="edit-isbn"
                                value={bookForm.isbn}
                                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-category">Category *</Label>
                            <Select value={bookForm.category} onValueChange={(v) => setBookForm({ ...bookForm, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat.replace('_', ' ').toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-publisher">Publisher</Label>
                            <Input
                                id="edit-publisher"
                                value={bookForm.publisher}
                                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-year">Published Year</Label>
                            <Input
                                id="edit-year"
                                type="number"
                                value={bookForm.published_year}
                                onChange={(e) => setBookForm({ ...bookForm, published_year: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-copies">Total Copies *</Label>
                            <Input
                                id="edit-copies"
                                type="number"
                                min="1"
                                value={bookForm.total_copies}
                                onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-cover">Cover Image URL</Label>
                            <Input
                                id="edit-cover"
                                value={bookForm.cover_image}
                                onChange={(e) => setBookForm({ ...bookForm, cover_image: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={bookForm.description}
                                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setEditBookOpen(false); resetBookForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditBook} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Issue Book Dialog */}
            <Dialog open={issueBookOpen} onOpenChange={setIssueBookOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issue Book</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="issue-book">Select Book</Label>
                            <Select value={issueForm.book} onValueChange={(v) => setIssueForm({ ...issueForm, book: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a book" />
                                </SelectTrigger>
                                <SelectContent>
                                    {books.filter(b => b.available_copies > 0).map(book => (
                                        <SelectItem key={book.book_id} value={book.book_id}>
                                            {book.title} ({book.available_copies} available)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="issue-student">Select Student</Label>
                            <Select value={issueForm.student} onValueChange={(v) => setIssueForm({ ...issueForm, student: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a student" />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(student => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.first_name} {student.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIssueBookOpen(false); setIssueForm({ book: '', student: '' }); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleIssueBook} disabled={submitting}>
                            {submitting ? 'Issuing...' : 'Issue Book'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
