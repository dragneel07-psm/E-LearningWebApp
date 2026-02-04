'use client';

import { useState, useEffect } from 'react';
import { Question, academicAPI } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash, CheckCircle2, Circle } from 'lucide-react';

interface QuestionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    question?: Question;
    assessmentId: string;
    onSaved: () => void;
}

export function QuestionEditorModal({ isOpen, onClose, question, assessmentId, onSaved }: QuestionEditorModalProps) {
    const [saving, setSaving] = useState(false);

    // Form State
    const [text, setText] = useState('');
    const [type, setType] = useState<'mcq' | 'short_answer'>('mcq');
    const [points, setPoints] = useState(1);
    const [options, setOptions] = useState<string[]>(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (question) {
                setText(question.text);
                setType(question.type as 'mcq' | 'short_answer');
                setPoints(question.points);
                setOptions(question.type === 'mcq' ? question.options : ['', '', '', '']);
                setCorrectAnswer(question.correct_answer || '');
            } else {
                // Reset for new
                setText('');
                setType('mcq');
                setPoints(1);
                setOptions(['', '', '', '']);
                setCorrectAnswer('');
            }
        }
    }, [isOpen, question]);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);

        // If correct answer matches the old value, update it too
        // (Alternatively, store index of correct answer, but API uses string value)
        // Ideally we track by index. But let's stick to value matching for now or update check.
    };

    const handleSetCorrect = (option: string) => {
        setCorrectAnswer(option);
    };

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleSave = async () => {
        if (!text) {
            toast.error("Question text is required");
            return;
        }

        if (type === 'mcq') {
            const validOptions = options.filter(o => o.trim() !== '');
            if (validOptions.length < 2) {
                toast.error("MCQ must have at least 2 options");
                return;
            }
            if (!correctAnswer) {
                toast.error("Please select a correct answer");
                return;
            }
            if (!validOptions.includes(correctAnswer)) {
                // Should not happen if UI is consistent
                toast.error("Correct answer must be one of the options");
                return;
            }
        }

        try {
            setSaving(true);
            const payload = {
                assessment: assessmentId,
                text,
                type,
                points,
                options: type === 'mcq' ? options.filter(o => o.trim() !== '') : [],
                correct_answer: correctAnswer,
                order: 0, // Backend should handle auto-order
            };

            if (question) {
                await academicAPI.updateQuestion(question.question_id, payload);
            } else {
                await academicAPI.createQuestion(payload);
            }

            toast.success("Question saved");
            onSaved();
        } catch (error) {
            console.error("Failed to save question", error);
            toast.error("Failed to save question");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{question ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                    <DialogDescription>Create a question for your quiz.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="What is the capital of France?"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Points</Label>
                            <Input
                                type="number"
                                min={0}
                                value={points}
                                onChange={(e) => setPoints(parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    {type === 'mcq' && (
                        <div className="space-y-3">
                            <Label>Options</Label>
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleSetCorrect(option)}
                                        className={option === correctAnswer && option.trim() !== '' ? 'text-emerald-600' : 'text-slate-300'}
                                        disabled={!option.trim()}
                                        title="Mark as correct"
                                    >
                                        {option === correctAnswer && option.trim() !== '' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                    </Button>
                                    <Input
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        placeholder={`Option ${index + 1}`}
                                        className={option === correctAnswer ? 'border-emerald-500 ring-1 ring-emerald-500' : ''}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(index)} className="text-slate-400 hover:text-red-600">
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={handleAddOption} className="mt-2 w-full border-dashed">
                                <Plus className="h-4 w-4 mr-2" /> Add Option
                            </Button>
                        </div>
                    )}

                    {type === 'short_answer' && (
                        <div className="space-y-2">
                            <Label>Correct Answer (Example)</Label>
                            <Input
                                value={correctAnswer}
                                onChange={(e) => setCorrectAnswer(e.target.value)}
                                placeholder="Enter the exact answer key"
                            />
                            <p className="text-xs text-slate-500">Students must match this answer (case-insensitive usually).</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Question
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
