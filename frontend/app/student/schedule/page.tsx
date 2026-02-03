"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Calendar, BookOpen, CheckCircle2 } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { toast } from "sonner";

export default function StudentSchedulePage() {
    const router = useRouter();
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const data = await api.ai.getStudySchedule();
            setSchedule(data);
        } catch (error) {
            console.error("Error fetching schedule:", error);
            toast.error("Failed to load study schedule.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSchedule = async () => {
        setGenerating(true);
        try {
            const data = await api.ai.generateStudySchedule();
            setSchedule(data); // Replace with new
            toast.success("Your personalized study plan is ready!");
        } catch (error) {
            console.error("Error generating schedule:", error);
            toast.error("Failed to generate schedule.");
        } finally {
            setGenerating(false);
        }
    };

    const toggleComplete = async (eventId: string, currentStatus: boolean) => {
        // Optimistic update
        setSchedule(prev => prev.map(e =>
            e.id === eventId ? { ...e, is_completed: !currentStatus } : e
        ));

        try {
            await api.ai.updateStudyEvent(eventId, { is_completed: !currentStatus });
        } catch (error) {
            console.error("Error updating event:", error);
            // Revert
            setSchedule(prev => prev.map(e =>
                e.id === eventId ? { ...e, is_completed: currentStatus } : e
            ));
            toast.error("Failed to update status");
        }
    };

    // Group by day
    const groupedEvents: { [key: string]: any[] } = {};
    schedule.forEach(event => {
        const dateKey = format(parseISO(event.start_time), 'yyyy-MM-dd');
        if (!groupedEvents[dateKey]) groupedEvents[dateKey] = [];
        groupedEvents[dateKey].push(event);
    });

    const sortedDates = Object.keys(groupedEvents).sort();

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Smart Study Planner</h1>
                    <p className="text-muted-foreground">AI-optimized schedule based on your learning needs.</p>
                </div>
                <Button onClick={handleGenerateSchedule} disabled={generating}>
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                    Generate New Schedule
                </Button>
            </div>

            {schedule.length === 0 ? (
                <Card className="text-center p-12">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="p-4 bg-primary/10 rounded-full">
                            <Calendar className="h-12 w-12 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">No Schedule Found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            You don't have an active study plan. identifying your weak areas and generating a personalized schedule for you.
                        </p>
                        <Button onClick={handleGenerateSchedule} disabled={generating}>
                            {generating ? "Generating..." : "Generate AI Schedule"}
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-8">
                    {sortedDates.map(date => (
                        <div key={date} className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                {format(parseISO(date), 'EEEE, MMMM do')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedEvents[date].map((event: any) => {
                                    const isExam = event.event_type === 'exam';
                                    const isRemedial = event.title.includes('Remedial');

                                    return (
                                        <Card key={event.id} className={`transition-all ${event.is_completed ? 'opacity-60 bg-muted/50' : 'hover:shadow-md border-l-4'} ${isExam ? 'border-l-destructive' : isRemedial ? 'border-l-orange-500' : 'border-l-primary'
                                            }`}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <Badge className={
                                                        isExam ? 'bg-destructive hover:bg-destructive' :
                                                            isRemedial ? 'bg-orange-500 hover:bg-orange-600' :
                                                                'bg-primary'
                                                    }>
                                                        {isExam ? 'High Priority: Exam' : isRemedial ? 'Remedial Focus' : 'Self Study'}
                                                    </Badge>
                                                    <Checkbox
                                                        checked={event.is_completed}
                                                        onCheckedChange={() => toggleComplete(event.id, event.is_completed)}
                                                    />
                                                </div>
                                                <CardTitle className={`text-base mt-2 ${event.is_completed ? 'line-through' : ''}`}>
                                                    {event.title}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-1">
                                                    <Loader2 className="h-3 w-3 animate-pulse text-muted-foreground" />
                                                    {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    <p className="text-sm text-foreground/80 line-clamp-2">
                                                        {event.description.split('\nFocus:')[0]}
                                                    </p>

                                                    {event.description.includes('Focus:') && (
                                                        <div className="bg-primary/5 p-2 rounded-md border border-primary/10">
                                                            <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider flex items-center gap-1">
                                                                <BookOpen className="h-3 w-3" /> Learning Path Focus
                                                            </p>
                                                            <p className="text-xs text-foreground/90 italic">
                                                                {event.description.split('Focus:')[1]}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {event.is_completed && (
                                                        <div className="flex items-center text-green-600 text-xs font-medium">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
