'use client';

// Right panel of the active session view: live student responses, analytics, and timer.
// Supports collapsing to a narrow icon strip.
//
// Tab layout:
//   "Responses"  (value="list")      — ResponseListTab: live responses, MC breakdown, flags
//   "Metrics"    (value="analytics") — DiscussionAnalyticsContent: participation stats
//   "Timer"      (value="timer")     — TimerTab: countdown + extend/edit + Close Discussion
//
// Extracted sub-components (each in their own file):
//   TimerTab.tsx        — timer display, edit/extend controls, Close Discussion button
//   ResponseListTab.tsx — response cards, MC option breakdown, flagged response management
//
// The CircularTimer shared component (src/components/ui/CircularTimer.tsx) is used by
// TimerTab (instructor) and DiscussionTimer (student) — both see the same arc and threshold.

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { DiscussionAnalyticsContent } from './DiscussionAnalyticsModal';
import { useResponseSelection } from '@/hooks/useResponseSelection';
import { TimerTab } from './TimerTab';
import { ResponseListTab } from './ResponseListTab';

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

/** Displays live student responses, analytics, and timer for the active discussion. Supports collapsing. */
export function ActiveRightPanel(props: {
  responses?: Response[];
  activeDiscussion?: Discussion | null;
  studentCount?: number;
}) {
  const context = React.useContext(SessionContext);
  const responses = context ? context.responses : props.responses!;
  const activeDiscussion = context ? context.activeDiscussion : props.activeDiscussion!;
  const studentCount = context ? context.studentCount : (props.studentCount ?? 0);
  const removeResponse = context ? context.removeResponse : undefined;
  const restoreResponse = context ? context.restoreResponse : undefined;
  const flaggedResponses = context ? context.flaggedResponses : [];
  // Peak student count: the highest simultaneous student presence seen during the
  // current discussion — only goes up, never down. Shown alongside responses.length
  // to give the instructor a participation rate at a glance (e.g. "8 / 24 students").
  const peakStudentCount = context ? context.peakStudentCount : studentCount;

  // Timer props from context
  const activeDiscussionId = context ? (context.activeDiscussion?.id ?? null) : null;
  const timerEndTime = context ? context.discussionTimerEndTime : null;
  const timerTotalSeconds = context ? context.discussionTimerSeconds : null;
  const handleCloseDiscussion = context ? context.handleCloseDiscussion : () => {};
  const handleExtendTimer = context ? context.handleExtendTimer : undefined;
  const handleEditTimer = context ? context.handleEditTimer : undefined;

  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('list');

  function openTab(tab: string) {
    setActiveTab(tab);
    setCollapsed(false);
  }

  const {
    selectedIds, flaggingId, showHighlightedOnly,
    toggleSelected, handleFlagInappropriate,
    setShowHighlightedOnly, resetSelection, filterResponses,
  } = useResponseSelection({
    onRemove: removeResponse ?? (async () => {}),
  });

  // Clear selection and filter when active discussion changes so highlighted
  // responses from the previous discussion don't bleed into the next one.
  React.useEffect(() => { resetSelection(); }, [activeDiscussion?.id, resetSelection]);

  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';

  // Per-option response count for MC distribution display
  const distribution: Record<string, number> = {};
  if (isMC && activeDiscussion?.mc_options) {
    activeDiscussion.mc_options.forEach(opt => {
      distribution[opt.label] = 0;
    });
    responses.forEach(r => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }

  const hasActiveDiscussion = !!activeDiscussionId;
  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-200 bg-surface-raised border-l border-line-default"
      style={{ width: collapsed ? '52px' : '380px' }}
    >
      {/* ── Collapse toggle header ── */}
      <div className="flex items-center px-3 py-2.5 flex-shrink-0 border-b border-line-subtle">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand responses panel' : 'Collapse responses panel'}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 flex-shrink-0 text-content-muted"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </button>

        {!collapsed && (
          <div className="flex items-center justify-between flex-1 ml-2">
            <span className="text-xs font-semibold text-content-primary">
              Live Responses
            </span>
            <div className="flex items-center gap-1 text-xs text-content-muted">
              <span className="font-semibold text-content-secondary">
                {responses.length}
              </span>
              {peakStudentCount > 0 && (
                <span>/ {peakStudentCount}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Collapsed: icon strip with tab shortcuts ── */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 pt-4">
          {/* Responses icon */}
          <button
            title={`${responses.length} responses`}
            onClick={() => openTab('list')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 relative"
            style={{ color: activeTab === 'list' ? 'var(--color-primary-500)' : 'var(--text-muted)', background: activeTab === 'list' ? 'rgba(45,158,45,0.10)' : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = activeTab === 'list' ? 'rgba(45,158,45,0.10)' : 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = activeTab === 'list' ? 'var(--color-primary-500)' : 'var(--text-muted)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {responses.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center text-white bg-brand-500">
                {responses.length > 9 ? '9+' : responses.length}
              </span>
            )}
          </button>

          {/* Metrics icon */}
          <button
            title="Metrics"
            onClick={() => openTab('analytics')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{ color: activeTab === 'analytics' ? 'var(--color-primary-500)' : 'var(--text-muted)', background: activeTab === 'analytics' ? 'rgba(45,158,45,0.10)' : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = activeTab === 'analytics' ? 'rgba(45,158,45,0.10)' : 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = activeTab === 'analytics' ? 'var(--color-primary-500)' : 'var(--text-muted)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </button>

          {/* Timer icon — highlighted when a discussion is running */}
          <button
            title={hasActiveDiscussion ? (hasTimer ? 'Timer running' : 'No time limit') : 'Timer'}
            onClick={() => openTab('timer')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 relative"
            style={{ color: activeTab === 'timer' ? 'var(--color-primary-500)' : (hasActiveDiscussion ? 'var(--color-primary-500)' : 'var(--text-muted)'), background: activeTab === 'timer' ? 'rgba(45,158,45,0.10)' : 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = activeTab === 'timer' ? 'rgba(45,158,45,0.10)' : 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = (activeTab === 'timer' || hasActiveDiscussion) ? 'var(--color-primary-500)' : 'var(--text-muted)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {hasActiveDiscussion && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-500" />
            )}
          </button>
        </div>
      ) : (
        /* ── Expanded: full tabbed content ── */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full overflow-hidden">
          <div className="px-3 pt-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="list" className="text-xs">Responses</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">Metrics</TabsTrigger>
              <TabsTrigger value="timer" className="text-xs">
                Timer
                {hasActiveDiscussion && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block bg-brand-500" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 mt-3">
            <div className="px-3 pb-4">

              {/* ── Responses tab ── */}
              <TabsContent value="list" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <ResponseListTab
                  activeDiscussion={activeDiscussion}
                  responses={responses}
                  flaggedResponses={flaggedResponses}
                  isMC={isMC}
                  distribution={distribution}
                  restoreResponse={restoreResponse}
                  selectedIds={selectedIds}
                  showHighlightedOnly={showHighlightedOnly}
                  flaggingId={flaggingId}
                  toggleSelected={toggleSelected}
                  handleFlagInappropriate={handleFlagInappropriate}
                  setShowHighlightedOnly={setShowHighlightedOnly}
                  filterResponses={filterResponses}
                />
              </TabsContent>

              {/* ── Metrics tab ── */}
              <TabsContent value="analytics" className="mt-0 pt-2 focus-visible:outline-none focus-visible:ring-0">
                {activeDiscussion ? (
                  <DiscussionAnalyticsContent
                    discussion={activeDiscussion}
                    responses={responses}
                    studentCount={peakStudentCount}
                  />
                ) : (
                  <p className="text-sm py-8 text-center text-content-muted">
                    No active discussion
                  </p>
                )}
              </TabsContent>

              {/* ── Timer tab ── */}
              <TabsContent value="timer" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                <TimerTab
                  activeDiscussionId={activeDiscussionId}
                  timerEndTime={timerEndTime}
                  timerTotalSeconds={timerTotalSeconds}
                  onClose={handleCloseDiscussion}
                  onExtendTimer={handleExtendTimer}
                  onEditTimer={handleEditTimer}
                />
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>
      )}
    </aside>
  );
}
