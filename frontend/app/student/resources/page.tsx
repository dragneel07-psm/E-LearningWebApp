'use client';

/* eslint-disable @next/next/no-img-element */

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, BookOpen, Calculator, Beaker, Languages, Globe, Monitor, HeartPulse, PieChart } from 'lucide-react';
import Link from 'next/link';

export default function ResourcesPage() {
    const searchParams = useSearchParams();
    const gradeParam = searchParams.get('grade') || '10';
    const grade = parseInt(gradeParam);

    const mapping: Record<number, number> = {
        1: 21, 2: 7, 3: 22, 4: 23, 5: 24, 6: 25,
        7: 27, 8: 26, 9: 28, 10: 29, 11: 30, 12: 31
    };

    const courseId = mapping[grade] || 29;

    // Define subject deep links for specific grades
    const getSubjects = (grade: number, courseId: number) => {
        const baseUrl = `https://learning.cehrd.gov.np/course/view.php?id=${courseId}`;

        switch (grade) {
            case 10:
                return [
                    { name: 'Mathematics', icon: Calculator, url: `${baseUrl}&section=4`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { name: 'Science', icon: Beaker, url: `${baseUrl}&section=2`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { name: 'English', icon: Languages, url: `${baseUrl}&section=5`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { name: 'Nepali', icon: BookOpen, url: `${baseUrl}&section=3`, color: 'text-red-600', bg: 'bg-red-50' },
                    { name: 'Social Studies', icon: Globe, url: `${baseUrl}&section=1`, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { name: 'Computer Science', icon: Monitor, url: `${baseUrl}&section=6`, color: 'text-slate-600', bg: 'bg-slate-50' },
                    { name: 'Health & Physical', icon: HeartPulse, url: `${baseUrl}&section=7`, color: 'text-pink-600', bg: 'bg-pink-50' },
                    { name: 'Economics', icon: PieChart, url: `${baseUrl}&section=11`, color: 'text-teal-600', bg: 'bg-teal-50' },
                ];
            case 8:
                return [
                    { name: 'Mathematics', icon: Calculator, url: `${baseUrl}&section=4`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { name: 'Science', icon: Beaker, url: `${baseUrl}&section=5`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { name: 'English', icon: Languages, url: `${baseUrl}&section=1`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { name: 'Nepali', icon: BookOpen, url: `${baseUrl}&section=3`, color: 'text-red-600', bg: 'bg-red-50' },
                    { name: 'Social Studies', icon: Globe, url: `${baseUrl}&section=2`, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { name: 'Health & Moral', icon: HeartPulse, url: `${baseUrl}&section=6`, color: 'text-pink-600', bg: 'bg-pink-50' },
                ];
            default:
                // Generic fallback for other grades where we haven't mapped sections yet
                return [
                    { name: `Full Grade ${grade} Curriculum`, icon: BookOpen, url: baseUrl, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { name: 'Mathematics', icon: Calculator, url: `${baseUrl}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { name: 'Science', icon: Beaker, url: `${baseUrl}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { name: 'Languages', icon: Languages, url: `${baseUrl}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ];
        }
    };

    const subjects = getSubjects(grade, courseId);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/student">
                        <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <img src="https://learning.cehrd.gov.np/pluginfile.php/1/theme_moest/logo/1660209549/Emblem_of_Nepal.png" alt="Govt Logo" className="h-8" />
                            Govt. Learning Portal
                        </h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto p-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Grade {grade} Resources</h2>
                    <p className="text-muted-foreground mt-2">
                        Official open-source learning materials from the Center for Education and Human Resource Development (CEHRD).
                        Select a subject to access video lessons and textbooks.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map((subject) => (
                        <Card
                            key={subject.name}
                            className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 group"
                            onClick={() => window.open(subject.url, '_blank')}
                        >
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${subject.bg}`}>
                                    <subject.icon className={`h-6 w-6 ${subject.color}`} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg group-hover:text-indigo-700 transition-colors">{subject.name}</CardTitle>
                                    <CardDescription className="text-xs">CEHRD Module</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-slate-500 mt-2">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open Official Material
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-12 bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-semibold text-blue-900">Why use the Government Portal?</h3>
                        <p className="text-sm text-blue-700 mt-1 max-w-2xl">
                            These materials are aligned with the national curriculum and include official video lectures,
                            digital textbooks, and interactive exercises directly from the Ministry of Education.
                        </p>
                    </div>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => window.open('https://learning.cehrd.gov.np/', '_blank')}
                    >
                        Visit Main Website
                    </Button>
                </div>
            </main>
        </div>
    );
}
