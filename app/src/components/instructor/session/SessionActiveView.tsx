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
        liveActiveDiscussionId={vm.activeDiscussion?.id ?? null}
        liveActiveResponses={vm.responses}
      />
    );
    return context ? splitContent : <SessionProvider vm={vm}>{splitContent}</SessionProvider>;
  }

  const content = (
    <div
      className="min-h-screen flex flex-col bg-surface-base"
    >
      <SessionHeaderActive onSplitView={() => setSplitView(true)} />

      {vm.endError ? (
        <p
          className="text-sm px-6 py-2"
          style={{ color: 'oklch(0.577 0.245 27.325)', background: 'rgba(239,68,68,0.08)' }}
        >
          {vm.endError}
        </p>
      ) : null}

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <ActiveSidebar />

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <ActiveCenter />
          </div>
        </div>

        {/* Right panel */}
        <ActiveRightPanel />
      </div>

      <ConnectionStatus />
    </div>
  );

  return context ? content : <SessionProvider vm={vm}>{content}</SessionProvider>;
}
