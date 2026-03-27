'use client';

// Right panel of the active session view: live student responses, analytics, and timer.
// Supports collapsing to a narrow icon strip.
//
// When a discussion is active, a persistent "Close Discussion" strip is shown at the
// top of the panel (above the tabs when expanded, as an icon button when collapsed).
// This keeps the most time-sensitive action visible without requiring a tab switch.
//
// Tab layout:
//   "Responses"  (value="list")      — ResponseListTab: live responses, MC breakdown, flags
//   "Metrics"    (value="analytics") — DiscussionAnalyticsContent: participation stats
//   "Timer"      (value="timer")     — TimerTab: countdown + extend/edit controls
//
// Extracted sub-components (each in their own file):
//   TimerTab.tsx        — timer display, edit/extend controls
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
  const contextProps = useActiveRightPanelContext(props);
  const { responses, activeDiscussion, activeDiscussionId, timerEndTime, timerTotalSeconds,
    handleCloseDiscussion, handleExtendTimer, handleEditTimer, peakStudentCount,
    removeResponse, flaggedResponses } = contextProps;

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
  const distribution = calculateMCDistribution(activeDiscussion, responses);

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

      <div className="flex-1 flex flex-col h-[calc(100vh-56px)]">
        {collapsed ? (
          <CollapsedSidebarIcons
            responses={responses}
            activeTab={activeTab}
            openTab={openTab}
            hasActiveDiscussion={hasActiveDiscussion}
            hasTimer={hasTimer}
          />
        ) : (
          <ExpandedSidebarContent
            {...contextProps}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            distribution={distribution}
            selectedIds={selectedIds}
            showHighlightedOnly={showHighlightedOnly}
            flaggingId={flaggingId}
            toggleSelected={toggleSelected}
            handleFlagInappropriate={handleFlagInappropriate}
            setShowHighlightedOnly={setShowHighlightedOnly}
            filterResponses={filterResponses}
            openTab={openTab}
            isMC={isMC}
          />
        )}
      </div>
    </aside>
  );
}

// ─── Internal Hooks ──────────────────────────────────────────────────────────

function useActiveRightPanelContext(props: Readonly<{
  responses?: Response[];
  activeDiscussion?: Discussion | null;
  studentCount?: number;
}>) {
  const context = React.useContext(SessionContext);

  if (context) {
    return {
      responses: context.responses,
      activeDiscussion: context.activeDiscussion,
      studentCount: context.studentCount,
      removeResponse: context.removeResponse,
      restoreResponse: context.restoreResponse,
      flaggedResponses: context.flaggedResponses,
      peakStudentCount: context.peakStudentCount,
      activeDiscussionId: context.activeDiscussion?.id ?? null,
      timerEndTime: context.discussionTimerEndTime,
      timerTotalSeconds: context.discussionTimerSeconds,
      handleCloseDiscussion: context.handleCloseDiscussion,
      handleExtendTimer: context.handleExtendTimer,
      handleEditTimer: context.handleEditTimer,
      lessonId: context.lesson?.id,
    };
  }

  const studentCount = props.studentCount ?? 0;
  return {
    responses: props.responses!,
    activeDiscussion: props.activeDiscussion!,
    studentCount,
    removeResponse: undefined,
    restoreResponse: undefined,
    flaggedResponses: [] as Response[],
    peakStudentCount: studentCount,
    activeDiscussionId: null,
    timerEndTime: null,
    timerTotalSeconds: null,
    handleCloseDiscussion: () => { },
    handleExtendTimer: undefined,
    handleEditTimer: undefined,
    lessonId: undefined,
  };
}

function calculateMCDistribution(activeDiscussion: Discussion | null | undefined, responses: Response[]) {
  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';
  const distribution: Record<string, number> = {};
  if (isMC && activeDiscussion?.mc_options) {
    activeDiscussion.mc_options.forEach((opt: { label: string }) => { distribution[opt.label] = 0; });
    responses.forEach(r => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }
  return distribution;
}

// ─── Sub-components and Helper Views ──────────────────────────────────────────

function CollapsedSidebarIcons({
  responses, activeTab, openTab, hasActiveDiscussion, hasTimer
}: Readonly<{
  responses: Response[];
  activeTab: string;
  openTab: (tab: string) => void;
  hasActiveDiscussion: boolean;
  hasTimer: boolean;
}>) {
  let timerTitle = 'Timer';
  if (hasActiveDiscussion) {
    timerTitle = hasTimer ? 'Timer running' : 'No time limit';
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <SideIconButton icon="users" title={`${responses.length} responses`} count={responses.length} isActive={activeTab === 'list'} onClick={() => openTab('list')} />
      <SideIconButton icon="metrics" title="Metrics" isActive={activeTab === 'analytics'} onClick={() => openTab('analytics')} />
      <SideIconButton icon="timer" title={timerTitle} isActive={activeTab === 'timer'} onClick={() => openTab('timer')} activeIndicator={hasActiveDiscussion} />
    </div>
  );
}

function SideIconButton({ icon, title, count, isActive, onClick, activeIndicator }: Readonly<{
  icon: 'users' | 'metrics' | 'timer';
  title: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  activeIndicator?: boolean;
}>) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 relative"
      style={{ color: isActive ? 'var(--color-primary-500)' : 'var(--text-muted)', background: isActive ? 'rgba(45,158,45,0.10)' : 'transparent' }}
    >
      {icon === 'users' && <UsersIcon />}
      {icon === 'metrics' && <MetricsIcon />}
      {icon === 'timer' && <TimerIcon />}
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center text-white bg-brand-500">
          {count > 9 ? '9+' : count}
        </span>
      )}
      {activeIndicator && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-500" />}
    </button>
  );
}

const UsersIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const MetricsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
const TimerIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

function ExpandedSidebarContent(props: Readonly<ReturnType<typeof useActiveRightPanelContext> & {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  distribution: Record<string, number>;
  selectedIds: string[];
  showHighlightedOnly: boolean;
  flaggingId: string | null;
  toggleSelected: (id: string) => void;
  handleFlagInappropriate: (id: string) => Promise<void>;
  setShowHighlightedOnly: (v: boolean | ((p: boolean) => boolean)) => void;
  filterResponses: (r: Response[]) => Response[];
  openTab: (tab: string) => void;
  isMC: boolean;
}>) {
  const { activeTab, setActiveTab, activeDiscussion, responses, distribution, activeDiscussionId, timerEndTime, timerTotalSeconds, handleCloseDiscussion, handleExtendTimer, handleEditTimer, peakStudentCount, isMC } = props;
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="px-3 pt-2">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="list" className="text-xs">Responses</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Metrics</TabsTrigger>
          <TabsTrigger value="timer" className="text-xs">Timer{activeDiscussionId && <span className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block bg-brand-500" />}</TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="flex-1 mt-3">
        <div className="px-3 pb-4">
          <TabsContent value="list" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <ResponseListTab {...props} isMC={isMC} distribution={distribution} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-0 pt-2 focus-visible:outline-none focus-visible:ring-0">
            {activeDiscussion ? <DiscussionAnalyticsContent discussion={activeDiscussion} responses={responses} studentCount={peakStudentCount} lessonId={props.lessonId} /> : <p className="text-sm py-8 text-center text-content-muted">No active discussion</p>}
          </TabsContent>
          <TabsContent value="timer" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <TimerTab activeDiscussionId={activeDiscussionId} timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} onClose={handleCloseDiscussion} onExtendTimer={handleExtendTimer} onEditTimer={handleEditTimer} />
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );
}
