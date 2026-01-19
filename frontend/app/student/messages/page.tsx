'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Send } from 'lucide-react';

export default function MessagesPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Messages</h1>
                <p className="text-slate-600">Communication with your teachers and admins.</p>
            </div>

            <Card className="flex-1 flex overflow-hidden border shadow-lg">
                {/* Sidebar */}
                <div className="w-80 border-r bg-slate-50 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search messages..." className="pl-9 bg-white" />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`p-3 rounded-lg cursor-pointer ${i === 1 ? 'bg-indigo-50 border-indigo-100 border' : 'hover:bg-white border border-transparent'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-sm text-slate-900">Dr. Smith (Math)</span>
                                    <span className="text-xs text-slate-500">10:30 AM</span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-1">Please confirm if you received the worksheet.</p>
                                {i === 1 && <Badge className="mt-2 h-5 text-[10px] bg-indigo-600">New</Badge>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Chat Header */}
                    <div className="p-4 border-b flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">DS</div>
                            <div>
                                <h3 className="font-bold text-slate-800">Dr. Smith</h3>
                                <p className="text-xs text-green-600 flex items-center gap-1">● Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                        <div className="flex justify-start">
                            <div className="bg-white border rounded-2xl rounded-tl-none py-3 px-4 max-w-sm shadow-sm text-sm text-slate-800">
                                <p>Hello Emma, did you receive the worksheet for Algebra chapter 5?</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">10:30 AM</span>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none py-3 px-4 max-w-sm shadow-md text-sm">
                                <p>Yes Dr. Smith, I downloaded it from the resources section. I will submit it by tomorrow.</p>
                                <span className="text-[10px] text-indigo-200 mt-1 block text-right">10:32 AM</span>
                            </div>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t bg-white">
                        <div className="flex gap-2">
                            <Input placeholder="Type your message..." className="flex-1 bg-slate-50 border-slate-200" />
                            <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700"><Send className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
