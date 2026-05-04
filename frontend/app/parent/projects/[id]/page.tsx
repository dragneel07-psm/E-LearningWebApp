// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';

import { ActivityFeed } from '@/components/projects/ActivityFeed';
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar';
import { TaskKanban } from '@/components/projects/TaskKanban';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProjectSocket } from '@/hooks/useProjectSocket';
import {
    useProject,
    useProjectTasks,
    useProjectUpdates,
    type ProjectStatus,
} from '@/services/projects';

const STATUS_TONE: Record<ProjectStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    submitted: 'bg-amber-100 text-amber-800',
    graded: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-100 text-slate-500',
};

export default function ParentProjectDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id;

    const projectQ = useProject(id);
    const tasksQ = useProjectTasks(id);
    const updatesQ = useProjectUpdates(id);
    const wsStatus = useProjectSocket(id).status;

    if (projectQ.isLoading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
    if (projectQ.error || !projectQ.data) {
        return <p className="p-6 text-sm text-rose-600">Project not found.</p>;
    }
    const project = projectQ.data;

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
                            <Badge className={STATUS_TONE[project.status]}>{project.status}</Badge>
                            <span
                                className={`inline-flex items-center gap-1 text-xs ${
                                    wsStatus === 'open' ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                            >
                                {wsStatus === 'open' ? (
                                    <Wifi className="h-3 w-3" />
                                ) : (
                                    <WifiOff className="h-3 w-3" />
                                )}
                                {wsStatus}
                            </span>
                        </div>
                        {project.mentor_detail && (
                            <p className="text-sm text-slate-500">
                                Mentor: {project.mentor_detail.full_name}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <ProjectProgressBar value={project.progress_percent} label={project.progress_label} />
                    {project.due_date && (
                        <p className="text-xs text-slate-500">
                            Due {new Date(project.due_date).toLocaleString()}
                        </p>
                    )}
                    {project.final_grade != null && (
                        <p className="text-sm text-slate-700">
                            Final grade: <span className="font-semibold">{project.final_grade}</span>
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    {tasksQ.isLoading ? (
                        <p className="text-sm text-slate-500">Loading tasks…</p>
                    ) : (
                        <TaskKanban tasks={tasksQ.data || []} canDrag={false} onMove={() => {}} />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {updatesQ.isLoading ? (
                        <p className="text-sm text-slate-500">Loading activity…</p>
                    ) : (
                        <ActivityFeed updates={updatesQ.data || []} />
                    )}
                </CardContent>
            </Card>

            {project.description && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{project.description}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
