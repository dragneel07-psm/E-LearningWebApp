'use client';

import { Question } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash, GripVertical, CheckCircle2 } from 'lucide-react';

interface QuestionListProps {
    questions: Question[];
    onEdit: (q: Question) => void;
    onDelete: (id: string) => void;
}

export function QuestionList({ questions, onEdit, onDelete }: QuestionListProps) {
    if (questions.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <p className="text-slate-500 mb-4">No questions added yet.</p>
                <Button variant="outline" disabled>Use "Add Question" button</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {questions.map((q, index) => (
                <Card key={q.question_id || index} className="group border-slate-200 hover:border-indigo-300 transition-colors">
                    <CardContent className="p-0">
                        <div className="flex items-start gap-4 p-4">
                            <div className="mt-1 cursor-grab text-slate-300 hover:text-slate-500">
                                <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="h-8 w-8 min-w-[2rem] bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm">
                                {index + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <p className="font-medium text-slate-900 pr-4">{q.text}</p>
                                    <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">{q.type.replace('_', ' ')}</Badge>
                                </div>

                                {/* Options Preview */}
                                {q.type === 'mcq' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {q.options.map((opt, i) => (
                                            <div key={i} className={`text-sm px-3 py-1.5 rounded-md flex items-center gap-2 ${opt === q.correct_answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                                                {opt === q.correct_answer && <CheckCircle2 className="h-3 w-3" />}
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(q)}>
                                    <Pencil className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(q.question_id)} className="text-red-500 hover:bg-red-50">
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
