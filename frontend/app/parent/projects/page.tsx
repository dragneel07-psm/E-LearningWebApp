// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import Link from 'next/link';
import { FolderKanban } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar';
import { useProjects, type ProjectStatus } from '@/services/projects';

const STATUS_TONE: Record<ProjectStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    submitted: 'bg-amber-100 text-amber-800',
    graded: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-100 text-slate-500',
};

export default function ParentProjectsPage() {
    // Backend's project_visibility_q already filters to children's projects.
    const projectsQ = useProjects('all');

    return (
        <div className="space-y-6 p-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-900">Children&apos;s projects</h1>
                <p className="text-sm text-slate-500">
                    Read-only view of group + individual projects your children are part of.
                </p>
            </header>

            {projectsQ.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
            {projectsQ.error && (
                <p className="text-sm text-rose-600">Failed to load projects.</p>
            )}
            {projectsQ.data && projectsQ.data.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 p-10 text-center">
                    <FolderKanban className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No active projects right now.</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(projectsQ.data || []).map((p) => (
                    <Link key={p.project_id} href={`/parent/projects/${p.project_id}`} className="block">
                        <Card className="h-full transition-shadow hover:shadow-md">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base">{p.title}</CardTitle>
                                    <Badge className={STATUS_TONE[p.status]}>{p.status}</Badge>
                                </div>
                                {p.mentor_detail && (
                                    <p className="text-xs text-slate-500">
                                        Mentor: {p.mentor_detail.full_name}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ProjectProgressBar value={p.progress_percent} label={p.progress_label} />
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        {p.task_count} task{p.task_count === 1 ? '' : 's'}
                                    </span>
                                    {p.due_date && (
                                        <span>Due {new Date(p.due_date).toLocaleDateString()}</span>
                                    )}
                                </div>
                                {p.final_grade != null && (
                                    <p className="text-xs text-slate-700">
                                        Final grade:{' '}
                                        <span className="font-semibold">{p.final_grade}</span>
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
