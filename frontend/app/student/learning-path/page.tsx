'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, CheckCircle, Circle, Play, FileText, HelpCircle, Lock, ArrowRight, Star, Sparkles } from 'lucide-react';
import api, { Subject } from '@/lib/api'; // Using default export as 'api'
import { toast } from 'sonner';

// Interfaces (locally defined to match API response)
interface LearningNode {
    id: string;
    title: string;
    description: string;
    resource_type: 'video' | 'article' | 'quiz' | 'assignment' | 'topic';
    resource_link?: string;
    estimated_minutes: number;
    status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
    order: number;
}

interface LearningPath {
    id: string;
    title: string;
    description: string;
    subject: number | null;
    nodes: LearningNode[];
    created_at: string;
    is_active: boolean;
}

export default function LearningPathPage() {
    const [paths, setPaths] = useState<LearningPath[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);

    // Generate Dialog
    const [openGenerate, setOpenGenerate] = useState(false);
    const [genSubject, setGenSubject] = useState<string>('');
    const [genTopic, setGenTopic] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [myPaths, mySubjects] = await Promise.all([
                api.learningPaths.getPaths(),
                api.helpers.getStudentSubjects()
            ]);
            setPaths(myPaths);
            setSubjects(mySubjects);

            if (myPaths.length > 0) {
                // Select the most recent active path
                setSelectedPath(myPaths[0]); // Setup sorting by date ideally
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load learning paths');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!genSubject && !genTopic) {
            toast.error('Please select a subject or enter a topic');
            return;
        }

        try {
            setGenerating(true);
            const student = await api.academic.getMyStudent();
            const data = {
                student_id: student.id,
                subject_id: genSubject ? parseInt(genSubject) : undefined,
                topic_focus: genTopic
            };

            await api.learningPaths.generatePath(data);
            toast.success('Learning path generated successfully!');
            setOpenGenerate(false);
            setGenSubject('');
            setGenTopic('');
            loadData(); // Reload to see new path
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate path');
        } finally {
            setGenerating(false);
        }
    };

    const handleNodeAction = async (node: LearningNode) => {
        if (node.status === 'locked') return;

        if (node.status === 'completed') {
            toast.info('Already completed!');
            return;
        }

        // Simulate "Doing" the task...
        // In real app, this might navigate to a player

        // For demo: Mark complete
        try {
            await api.learningPaths.updateNodeStatus(node.id, 'completed');
            toast.success('Topic completed! Next node unlocked.');

            // Optimistic update or reload
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update progress');
        }
    };

    const getNodeIcon = (type: string) => {
        switch (type) {
            case 'video': return <Play className="h-4 w-4" />;
            case 'article': return <FileText className="h-4 w-4" />;
            case 'quiz': return <HelpCircle className="h-4 w-4" />;
            default: return <Star className="h-4 w-4" />;
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Brain className="h-8 w-8 text-indigo-600" />
                        AI Learning Paths
                    </h1>
                    <p className="text-muted-foreground">Personalized curriculum tailored to your performance.</p>
                </div>
                <Button onClick={() => setOpenGenerate(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Sparkles className="h-4 w-4" /> Generate New Path
                </Button>
            </div>

            {paths.length === 0 ? (
                <Card className="min-h-[300px] flex flex-col justify-center items-center text-center p-8 border-dashed">
                    <div className="bg-indigo-50 p-4 rounded-full mb-4">
                        <Sparkles className="h-12 w-12 text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No learning paths yet</h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                        Our AI can analyze your performance and generate a personalized study plan for you.
                    </p>
                    <Button onClick={() => setOpenGenerate(true)}>Generate My First Path</Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar: Path Selector */}
                    <Card className="lg:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg">Your Paths</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-4">
                            {paths.map(path => (
                                <button
                                    key={path.id}
                                    onClick={() => setSelectedPath(path)}
                                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${selectedPath?.id === path.id ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                >
                                    <div className="font-medium line-clamp-1">{path.title}</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        {path.nodes.filter(n => n.status === 'completed').length} / {path.nodes.length} Steps
                                    </div>
                                    <Progress value={(path.nodes.filter(n => n.status === 'completed').length / path.nodes.length) * 100} className="h-1 mt-2" />
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Main Content: Timeline */}
                    <Card className="lg:col-span-3">
                        {selectedPath && (
                            <>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle>{selectedPath.title}</CardTitle>
                                            <CardDescription>{selectedPath.description}</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 my-4">
                                        {selectedPath.nodes.sort((a, b) => a.order - b.order).map((node, index) => {
                                            const isComplete = node.status === 'completed';
                                            const isLocked = node.status === 'locked';
                                            const isNext = node.status === 'unlocked' || node.status === 'in_progress';

                                            return (
                                                <div key={node.id} className="relative pl-8">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute -left-[9px] top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center bg-white 
                                                        ${isComplete ? 'border-green-500 text-green-500' :
                                                            isNext ? 'border-indigo-600 text-indigo-600 ring-4 ring-indigo-50' :
                                                                'border-gray-300 text-gray-300'}`}>
                                                        {isComplete ? <CheckCircle className="h-3 w-3" /> :
                                                            isLocked ? <Lock className="h-3 w-3" /> :
                                                                <Circle className="h-3 w-3 fill-current" />}
                                                    </div>

                                                    <div className={`p-4 rounded-lg border transition-all ${isNext ? 'bg-white border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-80'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`p-1.5 rounded-md ${isNext ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'}`}>
                                                                    {getNodeIcon(node.resource_type)}
                                                                </span>
                                                                <h4 className={`font-semibold ${isComplete ? 'text-gray-700' : 'text-gray-900'}`}>{node.title}</h4>
                                                            </div>
                                                            <span className="text-xs font-mono text-muted-foreground">{node.estimated_minutes} min</span>
                                                        </div>

                                                        {isNext && (
                                                            <div className="mt-4 flex gap-3">
                                                                <Button size="sm" onClick={() => handleNodeAction(node)} className="gap-1">
                                                                    Start Learning <ArrowRight className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {isComplete && (
                                                            <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                                                                <CheckCircle className="h-3 w-3" /> Completed
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>
            )}

            {/* Generate Dialog */}
            <Dialog open={openGenerate} onOpenChange={setOpenGenerate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Personalized Path</DialogTitle>
                        <DialogDescription>
                            Our AI will analyze your past performance to create a custom curriculum.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Subject (Optional)</Label>
                            <Select value={genSubject} onValueChange={setGenSubject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Focus on a specific subject..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Topic Focus (Optional)</Label>
                            <Input
                                placeholder="e.g. Algebra, World War II, Photosynthesis"
                                value={genTopic}
                                onChange={(e) => setGenTopic(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenGenerate(false)}>Cancel</Button>
                        <Button onClick={handleGenerate} disabled={generating} className="bg-indigo-600">
                            {generating ? 'Generating...' : 'Generate Path'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
