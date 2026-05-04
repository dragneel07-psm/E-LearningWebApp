// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Send, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';

import { ActivityFeed } from '@/components/projects/ActivityFeed';
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar';
import { TaskKanban } from '@/components/projects/TaskKanban';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useProjectSocket } from '@/hooks/useProjectSocket';
import { toast } from '@/hooks/use-toast';
import { getUser } from '@/lib/auth';
import {
    projectKeys,
    projectsAPI,
    usePostComment,
    useProject,
    useProjectMembers,
    useProjectTasks,
    useProjectUpdates,
    useUpdateTask,
    type ProjectStatus,
    type ProjectTask,
    type TaskStatus,
} from '@/services/projects';

const STATUS_TONE: Record<ProjectStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-blue-100 text-blue-700',
    submitted: 'bg-amber-100 text-amber-800',
    graded: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-slate-100 text-slate-500',
};

export default function StudentProjectDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id;
    const qc = useQueryClient();

    const projectQ = useProject(id);
    const tasksQ = useProjectTasks(id);
    const updatesQ = useProjectUpdates(id);
    const membersQ = useProjectMembers(id);
    const wsStatus = useProjectSocket(id).status;

    const updateTask = useUpdateTask(id || '');
    const postComment = usePostComment(id || '');

    const [comment, setComment] = useState('');
    const me = getUser();

    if (projectQ.isLoading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
    if (projectQ.error || !projectQ.data) {
        return (
            <p className="p-6 text-sm text-rose-600">
                Project not found or you don&apos;t have access.
            </p>
        );
    }

    const project = projectQ.data;
    const tasks = tasksQ.data || [];

    // The student-brief serializer doesn't expose user_id today, so we match
    // by the displayed full name. The backend RBAC is the real authority for
    // who can edit what — this only drives UI affordances.
    const myFullName = me ? [me.first_name, me.last_name].filter(Boolean).join(' ') : '';
    const isLeader = Boolean(
        project.leader_detail && myFullName && project.leader_detail.name === myFullName,
    );
    const canDrag = isLeader;

    const myTasks: ProjectTask[] = tasks.filter(
        (t) => t.assignee_detail && myFullName && t.assignee_detail.name === myFullName,
    );

    // Read membersQ.data so the call isn't unused — it primes the cache and
    // also unlocks future enrichments (avatars, leader switch).
    void membersQ.data;

    const handleMove = (taskId: string, newStatus: TaskStatus) => {
        updateTask.mutate(
            { id: taskId, payload: { status: newStatus } },
            {
                onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
            },
        );
    };

    const handleSubmit = async () => {
        try {
            await projectsAPI.submit(project.project_id);
            toast({ title: 'Project submitted' });
            qc.invalidateQueries({ queryKey: projectKeys.detail(project.project_id) });
        } catch (err) {
            const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast({ title: 'Submit failed', description: detail, variant: 'destructive' });
        }
    };

    const handlePostComment = async () => {
        if (!comment.trim()) return;
        try {
            await postComment.mutateAsync(comment.trim());
            setComment('');
        } catch {
            toast({ title: 'Comment failed', variant: 'destructive' });
        }
    };

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
                                title={`WebSocket ${wsStatus}`}
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
                {isLeader && project.status === 'active' && (
                    <Button onClick={handleSubmit}>
                        <Send className="mr-1 h-4 w-4" /> Submit project
                    </Button>
                )}
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

            {myTasks.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">My tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {myTasks.map((t) => (
                                <li
                                    key={t.task_id}
                                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                >
                                    <span>{t.title}</span>
                                    <select
                                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                                        value={t.status}
                                        onChange={(e) =>
                                            handleMove(t.task_id, e.target.value as TaskStatus)
                                        }
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="review">Review</option>
                                        <option value="done">Done</option>
                                        <option value="blocked">Blocked</option>
                                    </select>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">All tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    {tasksQ.isLoading ? (
                        <p className="text-sm text-slate-500">Loading tasks…</p>
                    ) : (
                        <TaskKanban tasks={tasks} canDrag={canDrag} onMove={handleMove} />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-2">
                        <Textarea
                            placeholder="Comment for the team…"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={2}
                        />
                        <Button onClick={handlePostComment} disabled={postComment.isPending || !comment.trim()}>
                            <MessageSquare className="mr-1 h-4 w-4" /> Post
                        </Button>
                    </div>
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
