'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, MessageSquare } from 'lucide-react';
import { Result, Assessment, Subject } from '@/lib/api';

// Extended type to include details joined from other calls
export interface ResultWithDetails extends Result {
    assessmentDetails?: Assessment;
    subjectDetails?: Subject;
    percentage?: number;
}

interface ResultListProps {
    results: ResultWithDetails[];
}

export function ResultList({ results }: ResultListProps) {
    if (results.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-dashed">
                No results available yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {results.map((result) => (
                <div key={result.result_id || result.id} className="flex flex-col gap-3 p-4 rounded-lg border bg-white hover:bg-slate-50 transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${(result.percentage || 0) >= 80 ? 'bg-green-100 text-green-700' :
                                    (result.percentage || 0) >= 60 ? 'bg-blue-100 text-blue-700' :
                                        'bg-orange-100 text-orange-700'
                                }`}>
                                {result.percentage}%
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 line-clamp-1">
                                    {result.assessmentDetails?.title || result.assessment_title || 'Assessment'}
                                </h4>
                                <p className="text-sm text-slate-500 font-medium">
                                    {result.subjectDetails?.name || 'Subject'} • {new Date(result.submitted_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="font-bold text-lg text-slate-900">
                                {result.score} <span className="text-sm text-slate-400 font-normal">/ {result.assessmentDetails?.total_marks || 100}</span>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Section */}
                    {(result.ai_feedback || result.teacher_feedback) && (
                        <div className="mt-1 flex flex-col gap-2 bg-slate-50 p-3 rounded-md text-sm">
                            {result.teacher_feedback && (
                                <div className="flex gap-2 items-start">
                                    <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5" />
                                    <div>
                                        <span className="font-semibold text-slate-700">Teacher: </span>
                                        <span className="text-slate-600">{result.teacher_feedback}</span>
                                    </div>
                                </div>
                            )}
                            {result.ai_feedback && (
                                <div className="flex gap-2 items-start">
                                    <BrainCircuit className="h-4 w-4 text-indigo-500 mt-0.5" />
                                    <div>
                                        <span className="font-semibold text-indigo-700">AI Insight: </span>
                                        <span className="text-slate-600">{result.ai_feedback}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
