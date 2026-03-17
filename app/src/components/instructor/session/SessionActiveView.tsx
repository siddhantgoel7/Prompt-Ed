// Active session layout — composes the header, sidebar, center panel, right panel,
// and connection status indicator into the full instructor session UI.
'use client';
// MERGED: wires all AI props from VM to components

import * as React from 'react';
import { SessionHeaderActive } from '@/components/instructor/session/SessionHeaderActive';
import { ActiveSidebar } from '@/components/instructor/session/ActiveSidebar';
import { ActiveCenter } from '@/components/instructor/session/ActiveCenter';
import { ActiveRightPanel } from '@/components/instructor/session/ActiveRightPanel';
import { SplitView } from '@/components/instructor/session/SplitView';
import { ConnectionStatus } from '@/components/instructor/session/ConnectionStatus';
import { SessionProvider, SessionContext } from '@/components/instructor/session/SessionContext';
import { DiscussionTimerSection } from '@/components/instructor/session/DiscussionTimerSection';
import type { SessionVM } from '@/hooks/useSessionPage';

/** Renders the full active session layout; switches to SplitView when the split view toggle is active. */
export function SessionActiveView(props: { vm?: SessionVM }) {
  const context = React.useContext(SessionContext);
  const vm = context || props.vm!;
  const lesson = vm.lesson;
  const [splitView, setSplitView] = React.useState(false);

  if (splitView) {
    const splitContent = (
      <SplitView
        discussions={vm.discussions}
        lessonId={lesson.id}
        onBack={() => setSplitView(false)}
      />
    );
    return context ? splitContent : <SessionProvider vm={vm}>{splitContent}</SessionProvider>;
  }

  const content = (
    <div className="min-h-screen bg-white flex flex-col">
      <SessionHeaderActive onSplitView={() => setSplitView(true)} />

      {vm.endError ? <p className="text-sm text-red-600 px-6 py-2">{vm.endError}</p> : null}

      <div className="flex-1 flex flex-col md:flex-row">
        <ActiveSidebar />
        <div className="flex-1 flex flex-col">
          <ActiveCenter />
          <DiscussionTimerSection
            activeDiscussionId={vm.activeDiscussion?.id ?? null}
            timerEndTime={vm.discussionTimerEndTime}
            timerTotalSeconds={vm.discussionTimerSeconds}
            onClose={vm.handleCloseDiscussion}
            onExtendTimer={vm.handleExtendTimer}
            onEditTimer={vm.handleEditTimer}
          />
        </div>
        <ActiveRightPanel />
      </div>

      <ConnectionStatus />
    </div>
  );

  return context ? content : <SessionProvider vm={vm}>{content}</SessionProvider>;
}
