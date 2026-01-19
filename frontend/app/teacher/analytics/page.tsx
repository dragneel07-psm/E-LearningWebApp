'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, TrendingUp, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart, Legend, Cell } from 'recharts';

// Mock Analytics Data
const performanceData = [
    { week: 'Week 1', avgScore: 75, classAvg: 70 },
    { week: 'Week 2', avgScore: 78, classAvg: 72 },
    { week: 'Week 3', avgScore: 82, classAvg: 74 },
    { week: 'Week 4', avgScore: 80, classAvg: 75 },
    { week: 'Week 5', avgScore: 85, classAvg: 78 },
];

const topicDifficultyData = [
    { topic: 'Mechanics', score: 85 },
    { topic: 'Thermodynamics', score: 65 },
    { topic: 'Optics', score: 72 },
    { topic: 'Electromagnetism', score: 58 },
    { topic: 'Modern Physics', score: 80 },
];

const commonMistakes = [
    { id: 1, topic: 'Thermodynamics', issue: 'Confusing Heat and Temperature', frequency: '45% of students' },
    { id: 2, topic: 'Electromagnetism', issue: 'Right-hand rule application', frequency: '38% of students' },
    { id: 3, topic: 'Mechanics', issue: 'Forgetting vector direction', frequency: '30% of students' },
];

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState('month');

    return (
        <div className="p-6 md:p-8 min-h-screen bg-gray-50/50 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Exams & Analytics</h1>
                    <p className="text-muted-foreground mt-1">Deep dive into class performance and learning trends.</p>
                </div>
                <div className="flex gap-2">
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            <SelectItem value="10a">Class 10-A</SelectItem>
                            <SelectItem value="9b">Class 9-B</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Last Month</SelectItem>
                            <SelectItem value="term">This Term</SelectItem>
                            <SelectItem value="year">Use Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* AI Insight Box (Top Priority) */}
            <Card className="border-indigo-100 bg-indigo-50/40 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-bl-full opacity-50 -mr-16 -mt-16"></div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-indigo-600" />
                        AI Insights & Suggestions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-indigo-800">Teaching Improvements</h4>
                            <div className="p-3 bg-white rounded-lg border border-indigo-100 text-sm text-slate-700 shadow-sm">
                                <p className="leading-relaxed">
                                    Students are struggling consistently with <strong>Thermodynamics</strong> concepts. Consider dedicating an extra lab session to heat transfer experiments.
                                </p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-indigo-800">Recommended Revision</h4>
                            <div className="p-3 bg-white rounded-lg border border-indigo-100 text-sm text-slate-700 shadow-sm">
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Right-hand rule (Electromagnetism)</li>
                                    <li>Vector addition principles</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">Generate Lesson Plan for Weak Topics</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Average Score Trend */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-gray-800 flex items-center justify-between">
                            <span>Average Score Trend</span>
                            <span className="text-xs font-normal text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full">
                                <TrendingUp className="h-3 w-3 mr-1" /> +5% vs last month
                            </span>
                        </CardTitle>
                        <CardDescription>Comparison of class average vs overall standard</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="avgScore" name="Class Average" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4, fill: '#4F46E5', strokeWidth: 2, stroke: '#fff' }} />
                                <Line type="monotone" dataKey="classAvg" name="Grade Standard" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* List: Common Mistakes */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-gray-800">Common Mistakes</CardTitle>
                        <CardDescription>Top issues identified in recent exams</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {commonMistakes.map(mistake => (
                                <div key={mistake.id} className="flex gap-3 items-start p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                    <div className="mt-1">
                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-gray-900 text-sm">{mistake.issue}</h5>
                                        <p className="text-xs text-muted-foreground mt-0.5">{mistake.topic}</p>
                                        <Badge variant="secondary" className="mt-2 text-[10px] bg-slate-100 text-slate-600">
                                            {mistake.frequency}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-4 text-xs text-indigo-600">View All Analysis</Button>
                    </CardContent>
                </Card>

                {/* Chart 2: Topic Difficulty */}
                <Card className="lg:col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold text-gray-800">Topic Proficiency</CardTitle>
                        <CardDescription>Average mastery levels by major topic</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topicDifficultyData} layout="vertical" barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="topic" type="category" width={120} tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="score" name="Mastery Score" radius={[0, 4, 4, 0]}>
                                    {topicDifficultyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.score < 60 ? '#EF4444' : entry.score < 75 ? '#F59E0B' : '#10B981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
