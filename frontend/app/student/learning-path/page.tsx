'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api, LearningPath, LearningNode } from '@/lib/api';
import { toast } from 'sonner';
import {
    BrainCircuit, BookOpen, PlayCircle, FileText, CheckCircle2,
    Lock, ArrowRight, Loader2, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function LearningPathPage() {
    const [loading, setLoading] = useState(true);
    const [path, setPath] = useState<LearningPath | null>(null);
    const [generating, setGenerating] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadPath();
    }, []);

    async function loadPath() {
        try {
            const paths = await api.learningPaths.getPaths();
            // Get the most recent active path
            const activePath = paths.find(p => p.is_active) || paths[0];
            setPath(activePath || null);
        } catch (error) {
            console.error('Failed to load learning path', error);
            toast.error('Failed to load your learning path');
        } finally {
            setLoading(false);
        }
    }

    const handleGeneratePath = async () => {
        setGenerating(true);
        try {
            const student = await api.academic.getMyStudent();
            const newPath = await api.learningPaths.generatePath({
                student_id: student.id
            });
            setPath(newPath);
            toast.success("New learning path generated successfully!");
        } catch (error) {
            console.error('Failed to generate path', error);
            toast.error('Failed to generate learning path');
        } finally {
            setGenerating(false);
        }
    };

    const handleStartNode = async (node: LearningNode) => {
        if (node.status === 'locked') return;

        // If it links to a lesson, go there
        if (node.lesson) {
            // Need to fetch lesson to get subject/chapter info ideally, 
            // but for now we might redirect to a lesson viewer.
            // Simplified: redirect to lesson reader (assuming we have a route)
            // Or just mark complete for "Topic" nodes that are conceptual.
            router.push(`/student/courses/lessons/${node.lesson}`);
            return;
        }

        // For now, if it's a "Topic" or "Video" without direct lesson link in frontend router,
        // we simulate "starting" it by showing a modal or just marking complete for MVP demo.
        if (confirm(`Start "${node.title}"? (Click OK to simulate completion for demo)`)) {
            try {
                const res = await api.learningPaths.updateNodeStatus(node.id, 'completed');
                toast.success("Activity completed!");
                // Optimistic update
                if (path) {
                    const updatedNodes = path.nodes.map(n => {
                        if (n.id === node.id) return { ...n, status: 'completed' as const };
                        if (n.order === node.order + 1 && res.next_node_unlocked) return { ...n, status: 'unlocked' as const };
                        return n;
                    });
                    setPath({ ...path, nodes: updatedNodes });
                }
            } catch (error) {
                toast.error("Failed to update progress");
            }
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'video': return <PlayCircle className="h-5 w-5" />;
            case 'quiz': return <FileText className="h-5 w-5" />;
            case 'assignment': return <BookOpen className="h-5 w-5" />;
            default: return <BrainCircuit className="h-5 w-5" />;
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400">Loading your path...</div>;

    if (!path) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-indigo-500" />
                </div>
                <div className="max-w-md space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900">No Learning Path Found</h1>
                    <p className="text-slate-500">
                        Our AI can analyze your performance and create a personalized study plan just for you.
                    </p>
                </div>
                <Button
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    onClick={handleGeneratePath}
                    disabled={generating}
                >
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                    Generate My Path
                </Button>
            </div>
        );
    }

    const completedNodes = path.nodes.filter(n => n.status === 'completed').length;
    const progress = Math.round((completedNodes / path.nodes.length) * 100);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BrainCircuit className="h-8 w-8 text-indigo-600" /> Learning Path
                    </h1>
                    <p className="text-slate-500 mt-1">{path.title}</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-right">
                        <div className="text-xs font-medium text-slate-500">Progress</div>
                        <div className="text-lg font-bold text-indigo-600">{progress}%</div>
                    </div>
                    <Progress value={progress} className="w-24 h-2" />
                </div>
            </div>

            {/* Path Visualization */}
            <div className="relative space-y-8 before:absolute before:inset-0 before:left-8 md:before:left-1/2 before:w-0.5 before:-ml-px before:bg-slate-200 before:z-0">
                {path.nodes.map((node, index) => {
                    const isLeft = index % 2 === 0;
                    const isLocked = node.status === 'locked';
                    const isCompleted = node.status === 'completed';
                    const isActive = node.status === 'unlocked' || node.status === 'in_progress';

                    return (
                        <div key={node.id} className={cn(
                            "relative flex items-center md:justify-between",
                            !isLeft && "md:flex-row-reverse"
                        )}>
                            {/* Timeline Node Connector */}
                            <div className={cn(
                                "absolute left-8 md:left-1/2 -ml-3 md:-ml-4 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 z-10 flex items-center justify-center transition-colors shadow-sm",
                                isCompleted ? "bg-green-500 border-green-100 ring-4 ring-green-50" :
                                    isActive ? "bg-indigo-600 border-indigo-100 ring-4 ring-indigo-50" :
                                        "bg-slate-200 border-slate-100"
                            )}>
                                {isCompleted && <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-white" />}
                                {isLocked && <Lock className="h-3 w-3 md:h-4 md:w-4 text-slate-400" />}
                            </div>

                            {/* Content Card */}
                            <div className={cn(
                                "ml-20 md:ml-0 md:w-[45%]",  // Mobile left align, Desktop alternating
                            )}>
                                <Card className={cn(
                                    "transition-all hover:shadow-md cursor-pointer border-slate-200",
                                    isActive && "border-indigo-200 shadow-indigo-50 ring-1 ring-indigo-100",
                                    isLocked && "opacity-70 bg-slate-50 grayscale-[0.5]"
                                )} onClick={() => handleStartNode(node)}>
                                    <div className="p-4 flex items-start gap-4">
                                        <div className={cn(
                                            "p-3 rounded-lg flex-shrink-0",
                                            isCompleted ? "bg-green-100 text-green-600" :
                                                isActive ? "bg-indigo-100 text-indigo-600" :
                                                    "bg-slate-100 text-slate-400"
                                        )}>
                                            {getNodeIcon(node.resource_type)}
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Step {node.order} • {node.estimated_minutes} min
                                                </div>
                                                {isActive && (
                                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px]">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {node.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 line-clamp-2">
                                                {node.description}
                                            </p>

                                            {!isLocked && (
                                                <Button
                                                    size="sm"
                                                    variant={isActive ? "default" : "outline"}
                                                    className={cn(
                                                        "mt-3 h-8 w-full",
                                                        isActive && "bg-indigo-600 hover:bg-indigo-700",
                                                        isCompleted && "text-green-600 border-green-200 hover:bg-green-50"
                                                    )}
                                                >
                                                    {isCompleted ? "Review Again" : "Start Learning"}
                                                    {!isCompleted && <ArrowRight className="ml-1 h-3 w-3" />}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Empty space for alternating layout matching */}
                            <div className="hidden md:block md:w-[45%]" />
                        </div>
                    );
                })}
            </div>

            {/* Empty State / Completion */}
            {path.nodes.length > 0 && completedNodes === path.nodes.length && (
                <div className="text-center py-12 bg-green-50 rounded-2xl border border-green-100 animate-in fade-in zoom-in duration-700">
                    <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
                        <Sparkles className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-800">Path Completed!</h2>
                    <p className="text-green-700 mt-2">You've mastered this learning path. Great job!</p>
                    <Button
                        onClick={handleGeneratePath}
                        className="mt-6 bg-green-600 hover:bg-green-700 text-white"
                        disabled={generating}
                    >
                        {generating ? "Generating..." : "Generate New Challenge"}
                    </Button>
                </div>
            )}
        </div>
    );
}
