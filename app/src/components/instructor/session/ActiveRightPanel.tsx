'use client';

// Right panel of the active session view: live student responses, analytics, and timer.
// Supports collapsing to a narrow icon strip.
//
// Tab layout:
//   "Responses"  (value="list")      — live student responses with highlight/flag controls
//   "Metrics"    (value="analytics") — response count, MC breakdown, participation stats
//   "Timer"      (value="timer")     — countdown display + extend/edit controls + Close Discussion
//
// The circular timer display is provided by the shared CircularTimer component
// (src/components/ui/CircularTimer.tsx), which is also used by the student-facing
// DiscussionTimer. Both roles see the same arc, urgency colour, and threshold logic.

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { DiscussionAnalyticsContent } from './DiscussionAnalyticsModal';
import { useResponseSelection } from '@/hooks/useResponseSelection';
import { ResponseCard } from '@/components/instructor/ResponseCard';
import { FilterToggle } from '@/components/instructor/FilterToggle';
import { FlaggedFilterToggle } from '@/components/instructor/FlaggedFilterToggle';
import { StartDiscussionDialog } from './StartDiscussionDialog';
import { CircularTimer } from '@/components/ui/CircularTimer';

// ---------------------------------------------------------------------------
// Timer tab content
// ---------------------------------------------------------------------------

/**
 * Content rendered inside the "Timer" tab of the right panel.
 *
 * States:
 *   No active discussion — shows an empty state with a clock icon.
 *   Active, with timer   — shows CircularTimer + Edit / +10s controls + Close Discussion.
 *   Active, no timer     — shows the "∞ No time limit" pill + Close Discussion.
 *
 * Close Discussion is placed inside the timer card (not below it) so the instructor
 * always sees it without scrolling, regardless of which timer state is active.
 */
function TimerTab({
  activeDiscussionId,
  timerEndTime,
  timerTotalSeconds,
  onClose,
  onExtendTimer,
  onEditTimer,
}: {
  activeDiscussionId: string | null;
  /** Null when the discussion was started without a time limit. */
  timerEndTime: number | null;
  /** Null when the discussion was started without a time limit. */
  timerTotalSeconds: number | null;
  /** Called with the discussion ID when the instructor closes the discussion manually. */
  onClose: (id: string) => void;
  /** Adds `extra` seconds to the running timer by updating the DB end time. */
  onExtendTimer?: (extra: number) => Promise<void>;
  /** Replaces the timer entirely; pass null to remove the time limit. */
  onEditTimer?: (newSecs: number | null) => Promise<void>;
}) {
  // Controls whether the edit-timer dialog (StartDiscussionDialog reused) is visible.
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  if (!activeDiscussionId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(45,158,45,0.08)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active discussion</p>
      </div>
    );
  }

  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* Timer card */}
      <div
        className="rounded-2xl p-5 flex flex-col items-center gap-4"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Timer display */}
        {hasTimer ? (
          <CircularTimer timerEndTime={timerEndTime!} timerTotalSeconds={timerTotalSeconds!} testId="instructor-timer" />
        ) : (
          <div
            className="inline-flex items-center gap-3 px-5 py-2.5"
            data-testid="no-time-limit-label"
            style={{ borderRadius: '999px', border: '1px solid var(--border-default)', background: 'var(--surface-raised)' }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: '2px solid var(--color-primary-400)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>∞</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>No time limit</span>
            </div>
          </div>
        )}

        {/* Timer controls */}
        {hasTimer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditDialog(true)}
              data-testid="edit-timer-button"
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
              style={{ border: '1px solid var(--color-primary-400)', color: 'var(--color-primary-500)', background: 'rgba(45,158,45,0.06)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.14)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.06)'; }}
            >
              Edit
            </button>
            <button
              onClick={() => onExtendTimer?.(10)}
              data-testid="extend-timer-button"
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
              style={{ border: '1px solid var(--color-primary-400)', color: 'var(--color-primary-500)', background: 'rgba(45,158,45,0.06)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.14)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.06)'; }}
            >
              +10s
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-full" style={{ height: '1px', background: 'var(--border-subtle)' }} />

        {/* Close Discussion — solid red, compact, inside the card */}
        <button
          onClick={() => onClose(activeDiscussionId)}
          data-testid="close-discussion-button"
          className="px-5 py-1.5 rounded-full text-xs font-semibold text-white transition-all duration-150"
          style={{ background: '#dc2626', boxShadow: '0 2px 8px rgba(220,38,38,0.35)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#b91c1c'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#dc2626'; }}
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

  const [showFlagged, setShowFlagged] = React.useState(false);

  React.useEffect(() => {
    if (flaggedResponses.length === 0 && showFlagged) {
      setShowFlagged(false);
    }
  }, [flaggedResponses.length, showFlagged]);

  const [flaggedSelectedIds, setFlaggedSelectedIds] = React.useState<string[]>([]);
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const toggleFlaggedSelected = React.useCallback((id: string) => {
    setFlaggedSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleRestore = async (responseId: string) => {
    if (!restoreResponse) return;
    setRestoringId(responseId);
    try {
      await restoreResponse(responseId);
      setFlaggedSelectedIds(prev => prev.filter(x => x !== responseId));
    } catch (err) {
      console.error('Failed to restore response:', err);
    } finally {
      setRestoringId(null);
    }
  };

  React.useEffect(() => { resetSelection(); }, [activeDiscussion?.id, resetSelection]);

  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';

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

  // Whether a discussion is currently running
  const hasActiveDiscussion = !!activeDiscussionId;
  const hasTimer = timerEndTime !== null && timerTotalSeconds !== null;

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? '52px' : '380px',
        borderLeft: '1px solid var(--border-default)',
        background: 'var(--surface-raised)',
      }}
    >
      {/* Collapse toggle header */}
      <div
        className="flex items-center px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand responses panel' : 'Collapse responses panel'}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
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
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Live Responses
            </span>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {responses.length}
              </span>
              {peakStudentCount > 0 && (
                <span>/ {peakStudentCount}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapsed: icon buttons */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 pt-4">
          {/* Responses */}
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
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center text-white" style={{ background: 'var(--color-primary-500)' }}>
                {responses.length > 9 ? '9+' : responses.length}
              </span>
            )}
          </button>

          {/* Metrics */}
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

          {/* Timer */}
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
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-primary-500)' }} />
            )}
          </button>
        </div>
      ) : (
        /* Expanded: full content */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 h-full overflow-hidden">
          <div className="px-3 pt-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="list" className="text-xs">Responses</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs">Metrics</TabsTrigger>
              <TabsTrigger value="timer" className="text-xs">
                Timer
                {hasActiveDiscussion && (
                  <span
                    className="ml-1.5 w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: 'var(--color-primary-500)' }}
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 mt-3">
            <div className="px-3 pb-4">

              {/* Responses tab */}
              <TabsContent value="list" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                {!activeDiscussion ? (
                  <div className="flex-1 flex items-center justify-center p-6 text-center">
                    <div>
                      <div
                        className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                        style={{ background: 'rgba(45,158,45,0.08)' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active discussion</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {isMC && activeDiscussion?.mc_options && (
                      <div
                        className="mb-3 p-3 rounded-xl"
                        style={{
                          background: 'rgba(45,158,45,0.06)',
                          border: '1px solid rgba(45,158,45,0.15)',
                        }}
                      >
                        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Options
                        </div>
                        <div className="space-y-1.5 mb-3">
                          {activeDiscussion.mc_options.map((opt) => (
                            <div key={opt.label} className="text-xs flex items-start gap-1.5">
                              <span className="font-bold w-4 flex-shrink-0" style={{ color: 'var(--color-primary-600)' }}>
                                {opt.label}.
                              </span>
                              <span
                                className={activeDiscussion.correct_option === opt.label ? 'font-semibold' : ''}
                                style={{ color: activeDiscussion.correct_option === opt.label ? 'var(--color-primary-600)' : 'var(--text-secondary)' }}
                              >
                                {opt.text}
                                {activeDiscussion.correct_option === opt.label && (
                                  <span
                                    className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                    style={{ background: 'rgba(45,158,45,0.15)', color: 'var(--color-primary-600)' }}
                                  >
                                    Correct
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2.5" style={{ borderTop: '1px solid rgba(45,158,45,0.15)' }}>
                          <div className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            Distribution
                          </div>
                          {Object.entries(distribution).map(([label, count]) => (
                            <div key={label} className="flex justify-between items-center text-xs mb-1">
                              <span style={{ color: 'var(--text-muted)' }}>Option {label}</span>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 mb-2">
                      {selectedIds.length > 0 && responses.length > 0 && !showFlagged && (
                        <FilterToggle
                          variant="compact"
                          selectedCount={selectedIds.length}
                          showHighlightedOnly={showHighlightedOnly}
                          onToggle={() => setShowHighlightedOnly(prev => !prev)}
                          onShowAll={() => setShowHighlightedOnly(false)}
                        />
                      )}
                      {flaggedResponses.length > 0 && (
                        <FlaggedFilterToggle
                          variant="compact"
                          flaggedCount={flaggedResponses.length}
                          showFlagged={showFlagged}
                          onToggle={() => setShowFlagged(prev => !prev)}
                          onHide={() => setShowFlagged(false)}
                        />
                      )}
                    </div>

                    {responses.length === 0 && flaggedResponses.length === 0 ? (
                      <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        Waiting for student responses…
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {!showFlagged && filterResponses(responses).map((r) => (
                          <ResponseCard
                            key={r.id}
                            variant="compact"
                            responseText={r.response_text}
                            createdAt={r.created_at}
                            isSelected={selectedIds.includes(r.id)}
                            isBeingFlagged={flaggingId === r.id}
                            onToggle={() => toggleSelected(r.id)}
                            onFlag={() => void handleFlagInappropriate(r.id)}
                          />
                        ))}
                        {showFlagged && flaggedResponses.map((r) => (
                          <ResponseCard
                            key={r.id}
                            variant="compact"
                            mode="flagged"
                            responseText={r.response_text}
                            createdAt={r.created_at}
                            isSelected={flaggedSelectedIds.includes(r.id)}
                            isBeingFlagged={restoringId === r.id}
                            onToggle={() => toggleFlaggedSelected(r.id)}
                            onFlag={() => void handleRestore(r.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Metrics tab */}
              <TabsContent value="analytics" className="mt-0 pt-2 focus-visible:outline-none focus-visible:ring-0">
                {activeDiscussion ? (
                  <DiscussionAnalyticsContent
                    discussion={activeDiscussion}
                    responses={responses}
                    studentCount={peakStudentCount}
                  />
                ) : (
                  <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No active discussion
                  </p>
                )}
              </TabsContent>

              {/* Timer tab */}
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
