// Instructor session page — routes to the correct view (loading, not found, active, or ended)
// based on lesson state from the useSessionPage hook.
'use client';

import * as React from 'react';
import { useSessionPage } from '@/hooks/useSessionPage';

import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import { SessionLoading } from '@/components/instructor/session/SessionLoading';
import { SessionNotFound } from '@/components/instructor/session/SessionNotFound';
import { SessionProvider } from '@/components/instructor/session/SessionContext';

/** Renders the appropriate session view based on lesson status, wrapped in SessionProvider for context. */
export function SessionPage({ lessonId }: { lessonId: string }) {
  const vm = useSessionPage(lessonId);

  if (vm.loading) return <SessionLoading />;
  if (vm.notFound) return <SessionNotFound />;

  if (vm.lesson.status === 'ended') return (
    <SessionProvider vm={vm}>
      <SessionEndedView />
    </SessionProvider>
  );

  return (
    <SessionProvider vm={vm}>
      <SessionActiveView />
    </SessionProvider>
  );
}
