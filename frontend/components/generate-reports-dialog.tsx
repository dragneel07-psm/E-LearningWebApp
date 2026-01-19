import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Users, GraduationCap, BarChart } from 'lucide-react';
import { academicAPI } from '@/lib/api';

interface GenerateReportsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GenerateReportsDialog({ open, onOpenChange }: GenerateReportsDialogProps) {

    const generateCSV = async (type: 'students' | 'teachers') => {
        try {
            let data: Array<Array<string | number | boolean | null | undefined>> = [];
            let headers: string[] = [];
            let filename = '';

            if (type === 'students') {
                const students = await academicAPI.getStudents();
                headers = ['ID', 'First Name', 'Last Name', 'Email', 'Class', 'Status'];
                data = students.map(s => [s.student_id, s.first_name, s.last_name, s.email, s.academic_class, s.is_active ? 'Active' : 'Suspended']);
                filename = 'student_report.csv';
            } else {
                const teachers = await academicAPI.getTeachers();
                headers = ['ID', 'First Name', 'Last Name', 'Email', 'Designation', 'Status'];
                data = teachers.map(t => [t.teacher_id, t.first_name, t.last_name, t.email, t.designation, t.is_active ? 'Active' : 'Suspended']);
                filename = 'staff_report.csv';
            }

            const csvContent = [
                headers.join(','),
                ...data.map(row => row.map((cell) => `"${cell ?? ''}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
            alert('Failed to generate report');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Generate Reports
                    </DialogTitle>
                    <DialogDescription>
                        Select a report type to generate and download.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                        onClick={() => generateCSV('students')}
                    >
                        <GraduationCap className="h-8 w-8 text-indigo-500" />
                        <span className="font-semibold">Student Enrollment</span>
                        <span className="text-xs text-muted-foreground">Download CSV</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                        onClick={() => generateCSV('teachers')}
                    >
                        <Users className="h-8 w-8 text-emerald-500" />
                        <span className="font-semibold">Staff Directory</span>
                        <span className="text-xs text-muted-foreground">Download CSV</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-all"
                        onClick={() => alert('Feature coming soon: Comprehensive PDF generation requires backend PDF engine.')}
                    >
                        <BarChart className="h-8 w-8 text-blue-500" />
                        <span className="font-semibold">Academic Performance</span>
                        <span className="text-xs text-muted-foreground">Download PDF Summary</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2 hover:border-orange-500 hover:bg-orange-50 transition-all"
                        onClick={() => alert('Feature coming soon.')}
                    >
                        <FileText className="h-8 w-8 text-orange-500" />
                        <span className="font-semibold">Audit Logs</span>
                        <span className="text-xs text-muted-foreground">Export System Logs</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
