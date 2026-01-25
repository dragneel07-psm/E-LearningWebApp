'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Smartphone, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function TeacherAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const analytics = await api.ai.getTeacherAnalytics();
            setData(analytics);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    if (!data || data.error) return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{data?.error || 'Could not load data'}</AlertDescription>
        </Alert>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Brain className="h-8 w-8 text-indigo-600" />
                    AI Predictive Analytics
                </h1>
                <p className="text-muted-foreground">Insights into student performance and risk factors.</p>
            </div>

            {/* Top Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Students At Risk</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${data.at_risk_count > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.at_risk_count}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Topic Mastery</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.topic_mastery.filter((t: any) => t.score >= 80).length} Topics</div>
                        <p className="text-xs text-muted-foreground">Above 80% mastery avg</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.performance_trends.length > 0 ? data.performance_trends[data.performance_trends.length - 1].avgScore : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Last week's average</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mobile Usage</CardTitle>
                        <Smartphone className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">App Engagement</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Main Chart */}
                <Card className="col-span-1 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Performance Trends</CardTitle>
                        <CardDescription>Average class score over the last 4 weeks.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.performance_trends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="week" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="avgScore" stroke="#8884d8" strokeWidth={2} name="Class Avg" />
                                    <Line type="monotone" dataKey="classAvg" stroke="#82ca9d" strokeDasharray="5 5" name="Target" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* At Risk List */}
                <Card className="col-span-1 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>At-Risk Students</CardTitle>
                        <CardDescription>Students needing immediate intervention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.at_risk_students.map((student: any) => (
                                <div key={student.id} className="flex items-center justify-between space-x-4 border p-3 rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Risk: <span className={student.risk_level === 'High' ? 'text-red-600 font-bold' : 'text-orange-500'}>{student.risk_level}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {student.reasons.map((r: string, idx: number) => (
                                            <Badge key={idx} variant="outline" className="text-[10px] mb-1 block w-fit ml-auto border-red-200 bg-red-50 text-red-700">
                                                {r}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {data.at_risk_students.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                    No students currently at risk.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Topic Mastery */}
                <Card>
                    <CardHeader>
                        <CardTitle>Topic Mastery</CardTitle>
                        <CardDescription>Average proficiency by subject/topic.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.topic_mastery.map((topic: any) => (
                                <div key={topic.topic} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{topic.topic}</span>
                                        <span className="text-muted-foreground">{topic.score}%</span>
                                    </div>
                                    <Progress value={topic.score} className={topic.score < 60 ? 'bg-red-100' : ''} />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* AI Insights */}
                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-700">
                            <Brain className="h-5 w-5" />
                            AI Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {data.ai_insights.map((insight: string, idx: number) => (
                                <li key={idx} className="flex gap-2 text-sm text-gray-700">
                                    <div className="min-w-[4px] h-4 rounded-full bg-indigo-400 mt-1"></div>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
