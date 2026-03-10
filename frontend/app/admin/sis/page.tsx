'use client';

import { useState } from 'react';
import { SISDashboardOverview } from './SISDashboardOverview';
import { IncidentLog } from './IncidentLog';
import { HealthRecords } from './HealthRecords';
import { DocumentsManager } from './DocumentsManager';
import { StudentLeaveManager } from './StudentLeaveManager';
import { ComplaintManager } from './ComplaintManager';
import { LayoutDashboard, AlertTriangle, Heart, FileText, CalendarClock, MessageSquareWarning } from 'lucide-react';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'leaves', label: 'Leaves', icon: CalendarClock },
    { id: 'complaints', label: 'Complaints', icon: MessageSquareWarning },
] as const;

type TabId = typeof TABS[number]['id'];

export default function SISPage() {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900">Student Information System</h1>
                <p className="text-sm text-slate-500 mt-1">Health records, disciplinary incidents, and official documents</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap bg-slate-100 rounded-2xl p-1 gap-1 w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white shadow-sm text-indigo-700'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {activeTab === 'overview' && <SISDashboardOverview />}
            {activeTab === 'incidents' && <IncidentLog />}
            {activeTab === 'health' && <HealthRecords />}
            {activeTab === 'documents' && <DocumentsManager />}
            {activeTab === 'leaves' && <StudentLeaveManager />}
            {activeTab === 'complaints' && <ComplaintManager />}
        </div>
    );
}
