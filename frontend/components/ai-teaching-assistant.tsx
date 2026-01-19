'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Sparkles, MessageSquare, ListChecks, FileText, X, Send, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AIAction {
    label: string;
    icon: React.ElementType;
    prompt: string;
}

export function AITeachingAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: "Hello! I'm your AI Teaching Assistant. I can help you create quizzes, plan lessons, or analyze student performance. How can I assist you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const quickActions: AIAction[] = [
        { label: 'Generate Quiz', icon: ListChecks, prompt: 'Generate a 5-question multiple choice quiz on [Topic]' },
        { label: 'Create Homework', icon: FileText, prompt: 'Create a homework assignment for Class 10 Physics on Newton\'s Laws' },
        { label: 'Summarize Class', icon: MessageSquare, prompt: 'Summarize the key points from the last lesson on Algebra' },
        { label: 'Identify Weak Students', icon: Search, prompt: 'Analyze recent assessment results and identify students who need extra help' },
    ];

    const handleSubmit = async (prompt: string) => {
        if (!prompt.trim()) return;

        const userMsg = prompt;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');
        setLoading(true);

        // Mock AI response
        setTimeout(() => {
            let response = "I'm processing your request...";
            if (userMsg.includes('Quiz')) response = "Here is a draft quiz for your topic:\n1. Question 1...\n2. Question 2...\nWould you like me to save this to your Assessments?";
            else if (userMsg.includes('Homework')) response = "I've drafted a homework assignment. It covers the core concepts. You can review it in the Assignments tab.";
            else if (userMsg.includes('Weak')) response = "Based on the last quiz, 3 students scored below 60%: John Doe, Jane Smith, and Bob Brown. I recommend reviewing 'Quadratic Formulas' with them.";
            else response = `I've received your request: "${userMsg}". Here is some helpful information...`;

            setMessages(prev => [...prev, { role: 'ai', content: response }]);
            setLoading(false);
        }, 1500);
    };

    return (
        <>
            {/* Collapsed Trigger Button */}
            {!isOpen && (
                <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="h-auto py-4 rounded-l-xl rounded-r-none bg-indigo-600 hover:bg-indigo-700 shadow-lg flex flex-col gap-2 border-l border-white/20"
                    >
                        <BrainCircuit className="h-6 w-6" />
                        <span className="writing-mode-vertical text-xs font-bold tracking-wider" style={{ writingMode: 'vertical-rl' }}>AI ASSISTANT</span>
                    </Button>
                </div>
            )}

            {/* Mobile Trigger */}
            <div className="fixed bottom-6 right-6 z-50 lg:hidden">
                <Button
                    onClick={() => setIsOpen(true)}
                    size="icon"
                    className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl"
                >
                    <BrainCircuit className="h-8 w-8" />
                </Button>
            </div>


            {/* Expanded Panel (Overlay) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b flex items-center justify-between bg-indigo-50/50">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                                <BrainCircuit className="h-6 w-6" />
                                AI Teaching Assistant
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-tr-none'
                                            : 'bg-white border shadow-sm text-slate-800 rounded-tl-none'
                                        }`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border p-3 rounded-lg rounded-tl-none shadow-sm flex gap-2 items-center text-sm text-muted-foreground">
                                        <Sparkles className="h-4 w-4 animate-spin text-indigo-500" />
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-white space-y-4">
                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                {quickActions.map((action) => (
                                    <Button
                                        key={action.label}
                                        variant="outline"
                                        size="sm"
                                        className="justify-start h-auto py-2 px-3 text-xs border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                                        onClick={() => setInput(action.prompt)}
                                    >
                                        <action.icon className="h-3 w-3 mr-2 shrink-0" />
                                        {action.label}
                                    </Button>
                                ))}
                            </div>

                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
                                className="flex gap-2"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask for help..."
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button type="submit" size="icon" disabled={!input.trim() || loading} className="bg-indigo-600">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
