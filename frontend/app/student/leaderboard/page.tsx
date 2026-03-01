"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { academicAPI, gamificationAPI, usersAPI } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown, Users, School } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
    student_id: string;
    student_name: string;
    total_points: number;
    current_level: number;
    rank: number;
}

export default function LeaderboardPage() {
    const [scope, setScope] = useState<"class" | "school">("class");
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const [data, currentUser] = await Promise.all([
                    gamificationAPI.getLeaderboard(scope),
                    usersAPI.getMe().catch(() => null)
                ]);
                setLeaderboard(data);
                setUser(currentUser);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [scope]);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
            case 2: return <Medal className="w-6 h-6 text-slate-400 fill-slate-400" />;
            case 3: return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
            default: return <span className="font-bold text-slate-500 w-6 text-center">{rank}</span>;
        }
    };

    const getRowStyle = (rank: number) => {
        if (rank === 1) return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-sm";
        if (rank === 2) return "bg-slate-50 border-slate-200";
        if (rank === 3) return "bg-amber-50/50 border-amber-100";
        return "bg-white border-slate-100 hover:bg-slate-50";
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading rankings...</div>;

    if (user?.tenant_features?.student_gamification === false) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Trophy className="h-8 w-8 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Gamification Locked</h2>
                <p className="text-slate-500 max-w-md mx-auto">Leaderboards, ranks, and points are not enabled for your school portal.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                        Leaderboard
                    </h1>
                    <p className="text-slate-500">See who's leading the learning journey!</p>
                </div>

                <Tabs value={scope} onValueChange={(v) => setScope(v as "class" | "school")} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="class" className="gap-2">
                            <Users className="w-4 h-4" /> Class
                        </TabsTrigger>
                        <TabsTrigger value="school" className="gap-2">
                            <School className="w-4 h-4" /> School
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500">Loading rankings...</div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            No active students found in this leaderboard yet. Be the first!
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 p-6">
                            {leaderboard.map((entry, idx) => (
                                <motion.div
                                    key={entry.student_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                                        getRowStyle(entry.rank)
                                    )}
                                >
                                    <div className="flex-shrink-0 w-12 flex justify-center">
                                        {getRankIcon(entry.rank)}
                                    </div>

                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                                            {entry.student_name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-grow">
                                        <h3 className="font-bold text-slate-800">{entry.student_name}</h3>
                                        <p className="text-xs text-slate-500">Level {entry.current_level}</p>
                                    </div>

                                    <div className="text-right">
                                        <span className="block font-bold text-indigo-600 text-lg">
                                            {entry.total_points.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">XP</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
