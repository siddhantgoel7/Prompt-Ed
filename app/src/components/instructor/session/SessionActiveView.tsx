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
  const [mobileTab, setMobileTab] = React.useState<'capture' | 'history' | 'responses'>('capture');

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
    <div className="h-screen flex flex-col bg-surface-base">
      <SessionHeaderActive onSplitView={() => setSplitView(true)} />

      {vm.endError && (
        <p className="text-sm px-4 py-2" style={{ color: 'var(--color-error-600)', background: 'var(--color-error-alpha-08)' }}>
          {vm.endError}
        </p>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop View: all sidebar columns row-wise */}
        <div data-testid="desktop-layout" className="hidden lg:flex flex-1 overflow-hidden">
          <ActiveSidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <ActiveCenter />
            </div>
          </div>
          <ActiveRightPanel />
        </div>

        {/* Mobile View: single column switched by mobileTab */}
        <div data-testid="mobile-layout" className="flex-1 flex flex-col lg:hidden overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {mobileTab === 'capture' && (
              <div className="flex-1 overflow-hidden flex flex-col enter">
                <ActiveCenter />
              </div>
            )}
            {mobileTab === 'history' && (
              <div className="flex-1 overflow-hidden flex flex-col enter">
                <ActiveSidebar />
              </div>
            )}
            {mobileTab === 'responses' && (
              <div className="flex-1 overflow-hidden flex flex-col enter">
                <ActiveRightPanel />
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <nav 
            className="flex items-center justify-around border-t border-line-default bg-surface-glass backdrop-blur-xl px-2 py-1.5 pb-safe-offset-2"
            style={{ borderTopColor: 'var(--border-subtle)' }}
          >
            <MobileNavButton
              icon="mic"
              label="Capture"
              active={mobileTab === 'capture'}
              onClick={() => setMobileTab('capture')}
            />
            <MobileNavButton
              icon="history"
              label="History"
              active={mobileTab === 'history'}
              onClick={() => setMobileTab('history')}
            />
            <MobileNavButton
              icon="responses"
              label="Live"
              active={mobileTab === 'responses'}
              onClick={() => setMobileTab('responses')}
            />
          </nav>
        </div>
      </div>

      <ConnectionStatus />
    </div>
  );

  return context ? content : <SessionProvider vm={vm}>{content}</SessionProvider>;
}

function MobileNavButton({ icon, label, active, onClick }: Readonly<{ icon: string; label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1.5 transition-all duration-300 relative ${active ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
    >
      {active && (
        <span 
          className="absolute inset-x-2 top-0 h-[2px] rounded-full bg-brand-500 shadow-[0_0_8px_var(--color-primary-500)]"
          aria-hidden="true"
        />
      )}
      <div 
        className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all duration-300 ${active ? 'bg-brand-500/10 text-brand-600' : 'text-content-muted'}`}
      >
        {icon === 'mic' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        )}
        {icon === 'history' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
        )}
        {icon === 'responses' && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h5l2 8 5-16 2 8h5"/>
          </svg>
        )}
      </div>
      <span 
        className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${active ? 'text-brand-600' : 'text-content-muted'}`}
      >
        {label}
      </span>
    </button>
  );
}
