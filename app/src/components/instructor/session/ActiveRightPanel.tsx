'use client';

// Right panel of the active session view: live student responses, analytics, and timer.
// Supports collapsing to a narrow icon strip.

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
  const { responses, activeDiscussion, activeDiscussionId, timerEndTime, timerTotalSeconds } = contextProps;

  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('list');

  const openTab = (tab: string) => { setActiveTab(tab); setCollapsed(false); };

  const {
    selectedIds, flaggingId, showHighlightedOnly,
    toggleSelected, handleFlagInappropriate,
    setShowHighlightedOnly, resetSelection, filterResponses,
  } = useResponseSelection({ onRemove: contextProps.removeResponse ?? (async () => { }) });

  React.useEffect(() => { resetSelection(); }, [activeDiscussion?.id, resetSelection]);

  const distribution = calculateMCDistribution(activeDiscussion, responses);
  const hasActiveDiscussion = !!activeDiscussionId;
  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-200 bg-surface-raised border-l border-line-default"
      style={{ width: collapsed ? '52px' : '380px' }}
    >
      <div className="flex items-center justify-between h-14 px-3 border-b border-line-subtle bg-surface-glass backdrop-blur-md sticky top-0 z-10">
        {!collapsed && (
          <div className="flex items-center justify-between flex-1">
            <span className="text-xs font-semibold text-content-primary">Live Responses</span>
            <div className="flex items-center gap-1 text-xs text-content-muted mr-2">
              <span className="font-semibold text-content-secondary">{responses.length}</span>
              {contextProps.peakStudentCount > 0 && <span>/ {contextProps.peakStudentCount}</span>}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          className="p-1.5 rounded-md hover:bg-surface-raised transition-colors text-content-muted"
        >
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
            </svg>
          )}
        </button>
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
            isMC={activeDiscussion?.prompt_type === 'multiple_choice'}
          />
        )}
      </div>
    </aside>
  );
}

// ─── Internal Hooks ──────────────────────────────────────────────────────────

function useActiveRightPanelContext(props: any) {
  const context = React.useContext(SessionContext);
  const studentCount = context ? context.studentCount : (props.studentCount ?? 0);

  return {
    responses: context ? context.responses : props.responses!,
    activeDiscussion: context ? context.activeDiscussion : props.activeDiscussion!,
    studentCount,
    removeResponse: context ? context.removeResponse : undefined,
    restoreResponse: context ? context.restoreResponse : undefined,
    flaggedResponses: context ? context.flaggedResponses : [],
    peakStudentCount: context ? context.peakStudentCount : studentCount,
    activeDiscussionId: context ? (context.activeDiscussion?.id ?? null) : null,
    timerEndTime: context ? context.discussionTimerEndTime : null,
    timerTotalSeconds: context ? context.discussionTimerSeconds : null,
    handleCloseDiscussion: context ? context.handleCloseDiscussion : () => { },
    handleExtendTimer: context ? context.handleExtendTimer : undefined,
    handleEditTimer: context ? context.handleEditTimer : undefined,
  };
}

function calculateMCDistribution(activeDiscussion: any, responses: any[]) {
  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';
  const distribution: Record<string, number> = {};
  if (isMC && activeDiscussion?.mc_options) {
    activeDiscussion.mc_options.forEach((opt: any) => { distribution[opt.label] = 0; });
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
}: any) {
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

function SideIconButton({ icon, title, count, isActive, onClick, activeIndicator }: any) {
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

function ExpandedSidebarContent(props: any) {
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
            {activeDiscussion ? <DiscussionAnalyticsContent discussion={activeDiscussion} responses={responses} studentCount={peakStudentCount} /> : <p className="text-sm py-8 text-center text-content-muted">No active discussion</p>}
          </TabsContent>
          <TabsContent value="timer" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <TimerTab activeDiscussionId={activeDiscussionId} timerEndTime={timerEndTime} timerTotalSeconds={timerTotalSeconds} onClose={handleCloseDiscussion} onExtendTimer={handleExtendTimer} onEditTimer={handleEditTimer} />
          </TabsContent>
        </div>
      </ScrollArea>
    </Tabs>
  );
}
