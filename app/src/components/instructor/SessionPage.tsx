'use client';

import * as React from 'react';
import { useSessionPage } from '@/hooks/useSessionPage';

import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import { SessionLoading } from '@/components/instructor/session/SessionLoading';
import { SessionNotFound } from '@/components/instructor/session/SessionNotFound';

export function SessionPage({ lessonId }: { lessonId: string }) {
  const vm = useSessionPage(lessonId);

  if (vm.loading) return <SessionLoading />;
  if (vm.notFound) return <SessionNotFound />;

  // at this point, vm.lesson is guaranteed non-null (per VM contract)
  if (vm.lesson.status === 'ended') return <SessionEndedView vm={vm} />;
  return <SessionActiveView vm={vm} />;
}
