'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { aiAPI, ChatMessage, usersAPI } from '@/lib/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AITutorPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [studentId, setStudentId] = useState<string>('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadUser();
        loadConversation();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadUser = async () => {
        try {
            const user = await usersAPI.getMe();
            setStudentId(user.user_id);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadConversation = () => {
        const saved = localStorage.getItem('ai-tutor-conversation');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setMessages(Array.isArray(parsed) ? parsed : []);
            } catch {
                setMessages([]);
            }
        }
    };

    const saveConversation = (msgs: Message[]) => {
        localStorage.setItem('ai-tutor-conversation', JSON.stringify(msgs));
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !studentId) return;

        const userMessage: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const response = await aiAPI.chat(input, studentId, newMessages as ChatMessage[]);

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.response
            };

            const updatedMessages = [...newMessages, assistantMessage];
            setMessages(updatedMessages);
            saveConversation(updatedMessages);

            if (response.is_demo) {
                toast.info('Fallback AI response mode is active. Configure provider key/model for full quality.');
            }
        } catch (error) {
            console.error('AI chat error:', error);
            toast.error('Failed to get AI response');
            const failureReply: Message = {
                role: 'assistant',
                content: 'I could not process that right now. Please try again in a moment.',
            };
            const updatedMessages = [...newMessages, failureReply];
            setMessages(updatedMessages);
            saveConversation(updatedMessages);
        } finally {
            setLoading(false);
        }
    };

    const handleClearConversation = () => {
        if (confirm('Are you sure you want to clear the conversation?')) {
            setMessages([]);
            localStorage.removeItem('ai-tutor-conversation');
            toast.success('Conversation cleared');
        }
    };

    const exampleQuestions = [
        "Explain photosynthesis in simple terms",
        "Help me solve this math problem: 2x + 5 = 15",
        "What are the main causes of World War I?",
        "How do I write a good essay introduction?"
    ];

    return (
        <div className="h-[calc(100vh-8rem)] max-w-5xl mx-auto flex flex-col">
            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Sparkles className="h-8 w-8 text-indigo-600" />
                            AI Tutor
                        </h1>
                        <p className="text-muted-foreground">Your personal learning assistant</p>
                    </div>
                    {messages.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearConversation}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Clear Chat
                        </Button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Sparkles className="h-16 w-16 text-indigo-600 mb-4 opacity-20" />
                            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                            <p className="text-muted-foreground mb-6 max-w-md">
                                Ask me anything about your studies. I&apos;m here to help you learn!
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
                                {exampleQuestions.map((question, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        className="text-left h-auto py-3 px-4 whitespace-normal"
                                        onClick={() => setInput(question)}
                                    >
                                        {question}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-900'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none">
                                                <ReactMarkdown
                                                    components={{
                                                        code({ inline, className, children, ...props }: any) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    style={vscDarkPlus as any}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 rounded-lg p-4 flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button onClick={handleSend} disabled={loading || !input.trim()}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
