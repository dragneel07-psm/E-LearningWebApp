// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import MessagingPage from '@/components/messaging/MessagingPage';

export default function ParentMessagesPage() {
    return (
        <MessagingPage emptyStateMessage="Choose a conversation to message teachers or school staff." />
    );
}
