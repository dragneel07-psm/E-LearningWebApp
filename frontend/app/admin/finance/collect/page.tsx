'use client';

import FeeCollector from '@/components/finance/FeeCollector';

export default function AdminCollectDataPage() {
    return (
        <div className="max-w-6xl mx-auto py-6">
            <h1 className="text-2xl font-bold tracking-tight mb-6">Collect Payments</h1>
            <FeeCollector />
        </div>
    );
}
