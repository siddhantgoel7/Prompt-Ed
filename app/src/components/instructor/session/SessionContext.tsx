// React context that makes the session view-model (SessionVM) available to all
// session sub-components without prop drilling.
'use client';

import * as React from 'react';
import type { SessionVM } from '@/hooks/useSessionPage';

export const SessionContext = React.createContext<SessionVM | null>(null);

/** Provides the session VM to all child components via SessionContext. */
export function SessionProvider({ vm, children }: { vm: SessionVM; children: React.ReactNode }) {
    return <SessionContext.Provider value={vm}>{children}</SessionContext.Provider>;
}

/** Convenience hook that reads SessionContext; throws if used outside a SessionProvider. */
export function useSessionContext() {
    const context = React.useContext(SessionContext);
    if (!context) {
        throw new Error('useSessionContext must be used within a SessionProvider');
    }
    return context;
}
