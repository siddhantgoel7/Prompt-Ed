'use client';

import * as React from 'react';
import type { SessionVM } from '@/hooks/useSessionPage';

export const SessionContext = React.createContext<SessionVM | null>(null);

export function SessionProvider({ vm, children }: { vm: SessionVM; children: React.ReactNode }) {
    return <SessionContext.Provider value={vm}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
    const context = React.useContext(SessionContext);
    if (!context) {
        throw new Error('useSessionContext must be used within a SessionProvider');
    }
    return context;
}
