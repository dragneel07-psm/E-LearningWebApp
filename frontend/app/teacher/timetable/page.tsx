'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Users, ChevronRight, School } from 'lucide-react';
import { academicAPI, usersAPI, Timetable, Teacher } from '@/lib/api';
import { toast } from 'sonner';

export default function TeacherTimetablePage() {
    const [loading, setLoading] = useState(true);
    const [timetable, setTimetable] = useState<Timetable[]>([]);
    const [myTeacherProfile, setMyTeacherProfile] = useState<Teacher | null>(null);
    const [currentDay, setCurrentDay] = useState<string>(
        new Date().toLocaleDateString('en-US', { weekday: 'long' })
    );

    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        async function loadSchedule() {
            try {
                // 1. Get Current User and Teacher Profile
                const user = await usersAPI.getMe();
                // Fetch all teachers to match user_id (since getMe only returns User account)
                const teachers = await academicAPI.getTeachers();
                const me = teachers.find(t => t.user_id === user.user_id);

                if (me) {
                    setMyTeacherProfile(me);
                    // 2. Fetch Timetable
                    // If we have a dedicated "getMyTimetable" endpoint for teachers, use it.
                    // Otherwise, fetch all and filter. API definition shows getMyTimetable under generic academic section
                    // likely pointing to student view or generic filtered view. Let's try generic first with filtering.
                    const allTimetable = await academicAPI.getTimetable();

                    // Filter for this teacher
                    const mySchedule = allTimetable.filter(slot => slot.teacher === me.id || slot.teacher_name === user.username); // Fallback to matching name if IDs tricky

                    // Better approach: use ID match
                    const myScheduleById = allTimetable.filter(slot => slot.teacher === me.id);
                    setTimetable(myScheduleById);
                } else {
                    toast.error("Teacher profile not found.");
                }
            } catch (error) {
                console.error("Failed to load timetable", error);
                toast.error("Failed to load schedule");
            } finally {
                setLoading(false);
            }
        }
        loadSchedule();
    }, []);

    const getSlotsForDay = (day: string) => {
        return timetable
            .filter(t => t.day_of_week === day)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading schedule...</div>;

    if (!myTeacherProfile) return (
        <div className="p-12 text-center">
            <h2 className="text-xl font-bold text-slate-700">Teacher Profile Not Found</h2>
            <p className="text-slate-500">Please contact administration.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-indigo-600" /> My Timetable
                </h1>
                <p className="text-slate-500">Weekly class schedule and upcoming lessons</p>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <Tabs defaultValue={currentDay} onValueChange={setCurrentDay} className="w-full">
                    <CardHeader className="border-b border-slate-100 pb-0">
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle>Weekly Schedule</CardTitle>
                            <Badge variant="outline" className="px-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-200">
                                {timetable.length} Classes Total
                            </Badge>
                        </div>
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-2 overflow-x-auto">
                            {weekDays.map(day => (
                                <TabsTrigger
                                    key={day}
                                    value={day}
                                    className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-full px-6 transition-all border border-transparent data-[state=inactive]:border-slate-200 data-[state=inactive]:hover:bg-slate-50"
                                >
                                    {day}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </CardHeader>
                    {weekDays.map(day => (
                        <TabsContent key={day} value={day} className="p-6 m-0">
                            <div className="space-y-4">
                                {getSlotsForDay(day).length === 0 ? (
                                    <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <School className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">No classes scheduled for {day}</p>
                                        <p className="text-sm text-slate-400">Enjoy your free time!</p>
                                    </div>
                                ) : (
                                    getSlotsForDay(day).map((slot, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-4 p-4 border border-slate-200 rounded-xl hover:shadow-md hover:border-indigo-100 transition-all bg-white group">
                                            <div className="flex flex-col justify-center items-center md:items-start min-w-[120px] pr-4 md:border-r border-slate-100 text-slate-600">
                                                <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                                                    <Clock className="h-4 w-4 text-indigo-500" />
                                                    {slot.start_time.slice(0, 5)}
                                                </div>
                                                <div className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">
                                                    To {slot.end_time.slice(0, 5)}
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                                        {slot.subject_name}
                                                    </h3>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                                            <Users className="h-3 w-3" /> Class {slot.academic_class}
                                                        </span>
                                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md">
                                                            <MapPin className="h-3 w-3" /> {slot.room_number}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="sm" className="w-full md:w-auto bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 border shadow-sm">
                                                        Prepare Lesson
                                                    </Button>
                                                    <Button size="sm" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200">
                                                        Start Class <ChevronRight className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </Card>
        </div>
    );
}
