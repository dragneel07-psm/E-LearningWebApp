// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Crown, Trash2, UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { projectsAPI, type Project, type ProjectMember } from '@/services/projects';

interface MemberListProps {
    project: Project;
    members: ProjectMember[];
    canManage: boolean;
    onChanged: () => void;
}

export function MemberList({ project, members, canManage, onChanged }: MemberListProps) {
    const [studentId, setStudentId] = useState('');
    const [busy, setBusy] = useState(false);

    const handleAdd = async () => {
        const trimmed = studentId.trim();
        if (!trimmed) return;
        setBusy(true);
        try {
            await projectsAPI.addMember(project.project_id, trimmed);
            setStudentId('');
            toast({ title: 'Member added' });
            onChanged();
        } catch (err) {
            const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast({ title: 'Could not add member', description: detail || 'Please try again.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (memberStudentId: string) => {
        if (!confirm('Remove this member from the project?')) return;
        setBusy(true);
        try {
            await projectsAPI.removeMember(project.project_id, memberStudentId);
            toast({ title: 'Member removed' });
            onChanged();
        } catch {
            toast({ title: 'Remove failed', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const handleSetLeader = async (memberStudentId: string) => {
        setBusy(true);
        try {
            await projectsAPI.setLeader(project.project_id, memberStudentId);
            toast({ title: 'Leader updated' });
            onChanged();
        } catch {
            toast({ title: 'Could not set leader', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            {project.is_group && (project.min_group_size || project.max_group_size) && (
                <p className="text-xs text-slate-500">
                    Group size: {project.min_group_size ?? 0} – {project.max_group_size ?? '∞'} students
                </p>
            )}
            <ul className="space-y-2">
                {members.map((m) => {
                    const isLeader = m.role === 'leader' || m.student === project.leader;
                    return (
                        <li
                            key={m.membership_id}
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">
                                    {m.student_detail?.name || m.student}
                                </span>
                                {isLeader && (
                                    <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
                                        <Crown className="h-3 w-3" /> Leader
                                    </Badge>
                                )}
                            </div>
                            {canManage && (
                                <div className="flex items-center gap-2">
                                    {!isLeader && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={busy}
                                            onClick={() => handleSetLeader(m.student)}
                                        >
                                            Make leader
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() => handleRemove(m.student)}
                                        aria-label="Remove member"
                                    >
                                        <Trash2 className="h-4 w-4 text-rose-500" />
                                    </Button>
                                </div>
                            )}
                        </li>
                    );
                })}
                {!members.length && (
                    <li className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
                        No members yet.
                    </li>
                )}
            </ul>

            {canManage && project.is_group && (
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Student ID (UUID)"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        disabled={busy}
                    />
                    <Button type="button" onClick={handleAdd} disabled={busy || !studentId.trim()}>
                        <UserPlus className="mr-1 h-4 w-4" /> Add
                    </Button>
                </div>
            )}
        </div>
    );
}
