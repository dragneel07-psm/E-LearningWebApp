// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { academicAPI, Parent, Student } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
    Users, Loader2, AlertCircle, GraduationCap, CalendarDays,
    Activity, TrendingUp, ChevronRight, CalendarClock,
} from 'lucide-react';

export default function ParentChildrenPage() {
    const { toast } = useToast();
    const [parent, setParent] = useState<Parent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        academicAPI.getMyParent()
            .then(setParent)
            .catch(() => toast({ title: 'Error', description: 'Failed to load children.', variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, [toast]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
    );

    if (!parent) return null;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-4xl">
            <div>
                <div className="flex items-center gap-2 text-violet-600 font-bold mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Parent Portal</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Children</h1>
                <p className="text-slate-500 font-medium">
                    {parent.students.length} child{parent.students.length !== 1 ? 'ren' : ''} linked to your account.
                </p>
            </div>

            {parent.students.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="py-16 text-center">
                        <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No students linked yet. Contact the school administration.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {parent.students.map((child: Student) => {
                        const attPct = (child as any).attendance_percentage ?? 0;
                        return (
                            <Card key={child.student_id} className="border-slate-200 hover:shadow-md transition-all">
                                <CardContent className="p-5 space-y-4">
                                    {/* Avatar + name */}
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center font-black text-violet-700 text-xl shrink-0">
                                            {child.first_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-slate-900 text-lg leading-tight">{child.first_name} {child.last_name}</p>
                                            <p className="text-xs text-slate-400 truncate">{child.email}</p>
                                            <Badge className="mt-1 bg-violet-50 text-violet-700 border-violet-200 text-xs font-bold">
                                                {(child as any).class_name || 'No Class'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { icon: <Activity className="h-4 w-4 text-indigo-500" />, label: 'Focus', value: `${child.focus_score ?? 0}%`, bg: 'bg-indigo-50' },
                                            { icon: <TrendingUp className="h-4 w-4 text-orange-500" />, label: 'Streak', value: `${child.current_streak ?? 0}d`, bg: 'bg-orange-50' },
                                            { icon: <CalendarDays className="h-4 w-4 text-emerald-500" />, label: 'Attend.', value: `${attPct}%`, bg: 'bg-emerald-50' },
                                        ].map((s, i) => (
                                            <div key={i} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                                                <div className="flex justify-center mb-1">{s.icon}</div>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                                                <p className="text-sm font-black text-slate-800">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Attendance bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-500">
                                            <span>Attendance</span>
                                            <span className={attPct >= 75 ? 'text-emerald-600' : 'text-red-500'}>{attPct}%</span>
                                        </div>
                                        <Progress value={attPct} className="h-1.5" />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Link href={`/parent/children/${child.student_id}`} className="flex-1">
                                            <Button className="w-full h-9 text-xs font-bold rounded-xl gap-2 bg-violet-600 hover:bg-violet-700">
                                                <GraduationCap className="h-3.5 w-3.5" /> Profile
                                                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                                            </Button>
                                        </Link>
                                        <Link href="/parent/leaves">
                                            <Button variant="outline" className="h-9 text-xs font-bold rounded-xl gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                                                <CalendarClock className="h-3.5 w-3.5" /> Leave
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
