'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Trophy, Medal, Crown, Star,
    ArrowUp, ArrowDown, Search,
    ChevronRight, Zap
} from 'lucide-react';
import { gamificationAPI } from '@/lib/api';

interface LeaderboardEntry {
    student_id: string;
    student_name: string;
    total_points: number;
    badges_count: number;
    rank: number;
}

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadLeaderboard() {
            try {
                const data = await gamificationAPI.getLeaderboard();
                setEntries(data);
            } catch (error) {
                console.error('Failed to load leaderboard:', error);
            } finally {
                setLoading(false);
            }
        }
        loadLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-6 w-6 text-amber-500" />;
        if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
        if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />;
        return <span className="text-lg font-black text-slate-300">#{rank}</span>;
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <header className="space-y-2">
                <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-100 text-indigo-700 border-none font-bold">
                        Academic Season 2024
                    </Badge>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                    Class Leaderboard
                </h1>
                <p className="text-slate-500 font-medium max-w-2xl">
                    See how you rank against your classmates. Complete lessons and assessments to earn XP and unlock badges!
                </p>
            </header>

            {loading ? (
                <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Trophy className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800">No data yet</h2>
                    <p className="text-slate-500">The leaderboard will update as students earn points!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {/* Top 3 Spotlight */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                        {entries.slice(0, 3).map((entry) => (
                            <Card
                                key={entry.student_id}
                                className={`border-none shadow-xl transform hover:scale-105 transition-all
                                    ${entry.rank === 1 ? 'bg-gradient-to-br from-amber-50 to-white ring-2 ring-amber-200' :
                                        entry.rank === 2 ? 'bg-gradient-to-br from-slate-50 to-white opacity-95' :
                                            'bg-white opacity-90'}`}
                            >
                                <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className={`h-24 w-24 rounded-full flex items-center justify-center border-4 border-white shadow-2xl
                                            ${entry.rank === 1 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                            <span className="text-3xl font-black text-slate-700">
                                                {entry.student_name.charAt(0)}
                                            </span>
                                        </div>
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 transform scale-150">
                                            {getRankIcon(entry.rank)}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 truncate max-w-[150px]">
                                            {entry.student_name}
                                        </h3>
                                        <div className="flex items-center justify-center gap-1.5 mt-1 text-indigo-600 font-black">
                                            <Zap className="h-4 w-4 fill-indigo-600" />
                                            {entry.total_points} XP
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {Array.from({ length: Math.min(entry.badges_count, 3) }).map((_, i) => (
                                            <div key={i} className="h-8 w-8 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Rest of the list */}
                    <div className="space-y-3">
                        {entries.slice(3).map((entry) => (
                            <div
                                key={entry.student_id}
                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-100 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-6">
                                    <div className="w-8 text-center font-black text-slate-300 text-lg">
                                        #{entry.rank}
                                    </div>
                                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {entry.student_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{entry.student_name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <Star className="h-3 w-3" />
                                            {entry.badges_count} Badges Unlocked
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-lg font-black text-slate-700 flex items-center gap-1.5 justify-end">
                                            {entry.total_points}
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">XP</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold justify-end">
                                            <ArrowUp className="h-3 w-3" />
                                            Progressing
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
