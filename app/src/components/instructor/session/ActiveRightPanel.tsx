'use client';

// Right panel of the active session view: live student responses and analytics.
// Supports collapsing to a narrow icon strip.
//
// When a discussion is active, a persistent ActiveDiscussionStrip is shown above the
// tabs — always visible regardless of which tab is selected. It contains the live
// countdown timer, +10s, Edit, and Close Discussion controls, so the instructor never
// has to switch tabs to manage the discussion.
//
// Tab layout:
//   "Responses"  (value="list")      — ResponseListTab: live responses, MC breakdown, flags
//   "Metrics"    (value="analytics") — DiscussionAnalyticsContent: participation stats
//
// Extracted sub-components (each in their own file):
//   ResponseListTab.tsx — response cards, MC option breakdown, flagged response management

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { DiscussionAnalyticsContent } from './DiscussionAnalyticsModal';
import { useResponseSelection } from '@/hooks/useResponseSelection';
import { ResponseListTab } from './ResponseListTab';
import { StartDiscussionDialog } from './StartDiscussionDialog';

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

/** Displays live student responses, analytics, and timer for the active discussion. Supports collapsing. */
export function ActiveRightPanel(props: Readonly<{
  responses?: Response[];
  activeDiscussion?: Discussion | null;
  studentCount?: number;
}>) {
  const contextProps = useActiveRightPanelContext(props);
  const { responses, activeDiscussion, peakStudentCount, removeResponse } = contextProps;

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

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-300 bg-surface-raised border-l border-line-default w-full lg:w-auto"
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

      <div className="flex-1 flex flex-col h-full min-w-0 w-full overflow-hidden">
        {collapsed ? (
          <CollapsedSidebarIcons
            responses={responses}
            activeTab={activeTab}
            openTab={openTab}
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
  responses, activeTab, openTab,
}: Readonly<{
  responses: Response[];
  activeTab: string;
  openTab: (tab: string) => void;
}>) {
  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      <SideIconButton icon="users" title={`${responses.length} responses`} count={responses.length} isActive={activeTab === 'list'} onClick={() => openTab('list')} />
      <SideIconButton icon="metrics" title="Metrics" isActive={activeTab === 'analytics'} onClick={() => openTab('analytics')} />
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full overflow-hidden min-w-0 w-full">
      {/* Active discussion strip — always visible above tabs when a discussion is running */}
      {activeDiscussionId && (
        <ActiveDiscussionStrip
          activeDiscussionId={activeDiscussionId}
          timerEndTime={timerEndTime}
          timerTotalSeconds={timerTotalSeconds}
          onClose={handleCloseDiscussion}
          onExtendTimer={handleExtendTimer}
          onEditTimer={handleEditTimer}
        />
      )}
      <div className="px-3 pt-2">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="list" className="text-xs">Responses</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Metrics</TabsTrigger>
        </TabsList>
      </div>
      <ScrollArea className="flex-1 mt-3 min-w-0 w-full">
        <div className="px-3 pb-4 min-w-0 w-full">
          <TabsContent value="list" className="mt-0 focus-visible:outline-none focus-visible:ring-0 min-w-0 w-full">
            <ResponseListTab {...props} isMC={isMC} distribution={distribution} />
          </TabsContent>
          <TabsContent value="analytics" className="mt-0 pt-2 focus-visible:outline-none focus-visible:ring-0 min-w-0 w-full">
            {activeDiscussion ? <DiscussionAnalyticsContent discussion={activeDiscussion} responses={responses} studentCount={peakStudentCount} lessonId={props.lessonId} /> : <p className="text-sm py-8 text-center text-content-muted">No active discussion</p>}
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );
}

// ─── Active Discussion Strip ─────────────────────────────────────────────────

function formatStripTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Persistent bar above the tab list — shows countdown, +10s, Edit, and Close Discussion. */
function ActiveDiscussionStrip({
  activeDiscussionId,
  timerEndTime,
  timerTotalSeconds,
  onClose,
  onExtendTimer,
  onEditTimer,
}: Readonly<{
  activeDiscussionId: string;
  timerEndTime: number | null;
  timerTotalSeconds: number | null;
  onClose: (id: string) => void;
  onExtendTimer?: (extra: number) => Promise<void>;
  onEditTimer?: (newSecs: number | null) => Promise<void>;
}>) {
  const [remaining, setRemaining] = React.useState<number>(() =>
    timerEndTime ? Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000)) : 0
  );
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  React.useEffect(() => {
    if (!timerEndTime) return;
    const endTime = timerEndTime;
    function tick() { setRemaining(Math.max(0, Math.ceil((endTime - Date.now()) / 1000))); }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [timerEndTime]);

  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;
  const isUrgent = hasTimer && timerTotalSeconds > 0 && (remaining / timerTotalSeconds) < 0.2 && remaining > 0;
  const isExpired = hasTimer && remaining <= 0;

  return (
    <div className="px-3 pt-2" data-testid="discussion-strip">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: 'var(--color-primary-alpha-06)', border: '1px solid var(--color-primary-alpha-16)' }}
      >
        {/* Active indicator */}
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          {' '}Active
        </span>

        <div className="w-px h-4 bg-line-subtle shrink-0" />

        {/* Timer countdown or no-limit label */}
        {hasTimer ? (
          <>
            <span
              className="font-mono text-sm font-bold tabular-nums shrink-0"
              data-testid="discussion-strip-timer"
              style={{ color: isExpired || isUrgent ? 'var(--color-error-600)' : 'var(--text-primary)' }}
            >
              {isExpired ? '00:00' : formatStripTime(remaining)}
            </span>
            <button
              onClick={() => onExtendTimer?.(10)}
              data-testid="extend-timer-button"
              className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-150"
              style={{ border: '1px solid var(--color-primary-400)', color: 'var(--color-primary-500)', background: 'var(--color-primary-alpha-06)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-14)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-06)'; }}
            >
              +10s
            </button>
            <button
              onClick={() => setShowEditDialog(true)}
              data-testid="edit-timer-button"
              className="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-150"
              style={{ border: '1px solid var(--color-primary-400)', color: 'var(--color-primary-500)', background: 'var(--color-primary-alpha-06)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-14)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-06)'; }}
            >
              Edit
            </button>
          </>
        ) : (
          <span className="text-xs font-semibold text-content-muted shrink-0" data-testid="no-time-limit-label">∞ No limit</span>
        )}

        <div className="flex-1" />

        {/* Close Discussion */}
        <button
          onClick={() => onClose(activeDiscussionId)}
          data-testid="close-discussion-button"
          className="px-3 py-1 rounded-full text-xs font-semibold text-white shrink-0 transition-all duration-150"
          style={{ background: 'var(--color-error-600)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-error-700)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-error-600)'; }}
        >
          Close Discussion
        </button>
      </div>

      <StartDiscussionDialog
        open={showEditDialog}
        onConfirm={(newSecs) => { setShowEditDialog(false); onEditTimer?.(newSecs); }}
        onCancel={() => setShowEditDialog(false)}
        confirmLabel="Update Timer"
      />
    </div>
  );
}
