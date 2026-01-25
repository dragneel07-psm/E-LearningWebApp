'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Flame, Award, Trophy, Star,
    ChevronRight, Zap, Target
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { gamificationAPI, StudentBadge } from '@/lib/api';

interface GamificationWidgetProps {
    streak: number;
    totalPoints: number;
}

export function GamificationWidget({ streak, totalPoints }: GamificationWidgetProps) {
    const [badges, setBadges] = useState<StudentBadge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadBadges() {
            try {
                const data = await gamificationAPI.getStudentBadges();
                setBadges(data);
            } catch (error) {
                console.error('Failed to load badges:', error);
            } finally {
                setLoading(false);
            }
        }
        loadBadges();
    }, []);

    return (
        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black text-indigo-900 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-600" />
                    Student Achievement
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                            <Flame className={`h-6 w-6 ${streak > 0 ? 'text-orange-600 animate-pulse' : 'text-orange-300'}`} />
                        </div>
                        <p className="text-2xl font-black text-slate-800">{streak}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Streak</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                            <Star className="h-6 w-6 text-indigo-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-800">{totalPoints}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total XP</p>
                    </div>
                </div>

                {/* Badges Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        <span>Unlocked Badges</span>
                        <span className="text-indigo-600 cursor-pointer hover:underline">View All</span>
                    </div>

                    {loading ? (
                        <div className="h-12 w-full animate-pulse bg-slate-100 rounded-xl" />
                    ) : badges.length === 0 ? (
                        <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                            <Award className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Start learning to earn badges!</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {badges.slice(0, 4).map((sb) => (
                                <div
                                    key={sb.id}
                                    className="h-12 w-12 rounded-xl bg-white border border-indigo-50 shadow-sm flex items-center justify-center relative group"
                                    title={sb.badge_details?.name}
                                >
                                    <Trophy className="h-6 w-6 text-amber-500" />
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-indigo-600 rounded-full border-2 border-white" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Next Milestone */}
                <div className="p-4 bg-indigo-600 rounded-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 h-16 w-16 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all" />
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Target</p>
                        <h4 className="font-bold flex items-center gap-1.5 mb-2">
                            <Target className="h-4 w-4" />
                            Course Starter
                        </h4>
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                <span>3 / 5 Lessons</span>
                                <span>60%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white w-[60%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
