'use client';

// Full-screen split view overlay that renders two independent discussion-browsing panes
// side by side.
//
// Logical sections (in order):
//   Types          — SplitViewProps, PaneState
//   DiscussionList — tab UI listing active/closed discussions; clicking one selects it
//   DiscussionDetail — prompt text, status badge, and scrollable response list
//   Pane           — one half of the split; owns selection state + response loading
//   SplitView      — full-screen layout: header + two Panes

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLogo } from '@/components/ui/AppLogo';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';
import { ResponseCard } from '@/components/instructor/ResponseCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SplitViewProps {
  discussions: DiscussionWithResponseCount[];
  lessonId: string;
  onBack: () => void;
  liveActiveDiscussionId?: string | null;
  liveActiveResponses?: Response[];
}

interface PaneState {
  selectedDiscussionId: string | null;
  responses: Response[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// DiscussionList
// ---------------------------------------------------------------------------

/** Lists discussions grouped into Active and Closed tabs; clicking one selects it. */
function DiscussionList({
  discussions,
  onSelect,
}: Readonly<{
  discussions: DiscussionWithResponseCount[];
  onSelect: (id: string) => void;
}>) {
  const active = discussions.filter((d) => d.status === 'active');
  const closed = discussions.filter((d) => d.status === 'closed');

  const renderList = (list: DiscussionWithResponseCount[]) => {
    if (list.length === 0) {
      return (
        <p className="text-sm py-6 text-center text-content-muted">
          No discussions
        </p>
      );
    }
    return (
      <div className="space-y-2">
        {list.map((d, idx) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className="w-full text-left rounded-xl p-3 transition-all duration-150 bg-surface-raised"
            style={{
              border: '1px solid var(--border-default)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-300)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
            }}
          >
            <div className="flex items-start justify-between mb-1.5">
              <span className="text-xs font-semibold text-content-muted">
                #{idx + 1}
              </span>
              {d.status === 'active' ? (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-brand-600"
                  style={{ background: 'rgba(45,158,45,0.15)' }}
                >
                  Active
                </span>
              ) : (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-overlay text-content-muted"
                >
                  Closed
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed mb-1.5 text-content-primary break-words whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] line-clamp-3">
              {d.prompt_text}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-content-muted">
              <span className="font-semibold text-content-secondary">
                {d.response_count}
              </span>
              <span>{d.response_count === 1 ? 'response' : 'responses'}</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="active" className="w-full h-full flex flex-col">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="active" className="flex-1 text-xs">Active ({active.length})</TabsTrigger>
        <TabsTrigger value="closed" className="flex-1 text-xs">Closed ({closed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {renderList(active)}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="closed" className="mt-0 flex-1 min-h-0">
        <ScrollArea className="h-full">
          {renderList(closed)}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// DiscussionDetail
// ---------------------------------------------------------------------------

/** Shows the prompt text, status badge, and scrollable response list for a selected discussion. */
function DiscussionDetail({
  discussion,
  responses,
  loading,
  onBack,
}: Readonly<{
  discussion: DiscussionWithResponseCount;
  responses: Response[];
  loading: boolean;
  onBack: () => void;
}>) {
  const isMC = discussion.prompt_type === 'multiple_choice' && !!discussion.mc_options;
  const distribution: Record<string, number> = {};
  if (isMC && discussion.mc_options) {
    discussion.mc_options.forEach((opt) => { distribution[opt.label] = 0; });
    responses.forEach((r) => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }

  return (
    <div className="flex flex-col h-full min-w-0 w-full overflow-hidden">
      {/* Detail header */}
      <div
        className="px-4 pt-3 pb-3 flex-shrink-0 border-b border-line-subtle min-w-0 w-full"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors duration-150 text-content-muted"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-600)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>

        <p className="text-sm font-medium leading-relaxed mb-2 text-content-primary break-words whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word]">
          {discussion.prompt_text}
        </p>

        {discussion.status === 'active' ? (
          <span
            className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full text-brand-600"
            style={{ background: 'rgba(45,158,45,0.15)' }}
          >
            Active
          </span>
        ) : (
          <span
            className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-overlay text-content-muted"
          >
            Closed
          </span>
        )}
      </div>

      {isMC && discussion.mc_options && (
        <div className="px-4 py-3 border-b border-line-subtle">
          <div className="text-xs font-semibold mb-2 text-content-secondary">Options</div>
          <div className="space-y-1.5">
            {discussion.mc_options.map((opt) => (
              <div key={opt.label} className="flex justify-between items-start gap-2 text-xs">
                <span
                  className={discussion.correct_option === opt.label ? 'font-semibold text-brand-600' : 'text-content-secondary'}
                >
                  {opt.label}. {opt.text}
                </span>
                <span className="font-semibold text-content-primary">
                  {distribution[opt.label] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responses */}
      <ScrollArea className="flex-1 px-4 py-3 min-w-0 w-full">
        {(() => {
          if (loading) return (
            <div className="space-y-2">
              <div className="skeleton-shimmer h-16 w-full rounded-xl" />
              <div className="skeleton-shimmer h-16 w-full rounded-xl" />
            </div>
          );
          if (responses.length === 0) return (
            <p className="text-sm py-6 text-center text-content-muted">
              No responses yet.
            </p>
          );
          return (
            <div className="space-y-2 min-w-0 w-full overflow-hidden">
              {responses.map((r) => (
                <ResponseCard
                  key={r.id}
                  variant="full"
                  responseText={r.response_text}
                  createdAt={r.created_at}
                  isSelected={false}
                  isBeingFlagged={false}
                  onToggle={() => {}}
                />
              ))}
            </div>
          );
        })()}
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pane
// ---------------------------------------------------------------------------

/** One half of the split view — manages its own selected discussion and loaded responses. */
function Pane({
  label,
  discussions,
  liveActiveDiscussionId,
  liveActiveResponses,
}: Readonly<{
  label: string;
  discussions: DiscussionWithResponseCount[];
  liveActiveDiscussionId?: string | null;
  liveActiveResponses?: Response[];
}>) {
  const [state, setState] = React.useState<PaneState>({
    selectedDiscussionId: null,
    responses: [],
    loading: false,
  });

  // Fetch responses whenever the selected discussion changes.
  // `cancelled` is a closure flag that prevents stale async results from a previous
  // selection from overwriting the new selection's state after the effect cleans up.
  React.useEffect(() => {
    if (!state.selectedDiscussionId) return;
    if (state.selectedDiscussionId === liveActiveDiscussionId) return;

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    fetchResponsesApi(state.selectedDiscussionId, true)
      .then((data) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, responses: data, loading: false }));
      })
      .catch(() => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, responses: [], loading: false }));
      });

    return () => { cancelled = true; };
  }, [state.selectedDiscussionId, liveActiveDiscussionId]);

  const selectedDiscussion = discussions.find((d) => d.id === state.selectedDiscussionId) ?? null;
  const selectedResponses =
    selectedDiscussion?.id && selectedDiscussion.id === liveActiveDiscussionId
      ? (liveActiveResponses ?? [])
      : state.responses;
  const selectedLoading =
    selectedDiscussion?.id && selectedDiscussion.id === liveActiveDiscussionId
      ? false
      : state.loading;

  return (
    <div
      className="flex-1 flex flex-col min-w-0 w-full overflow-hidden border-r border-line-default"
    >
      {/* Pane label */}
      <div
        className="px-4 py-2 flex-shrink-0 bg-surface-overlay border-b border-line-default"
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider text-content-muted"
        >
          {label}
        </span>
      </div>

      {selectedDiscussion ? (
        <DiscussionDetail
          discussion={selectedDiscussion}
          responses={selectedResponses}
          loading={selectedLoading}
          onBack={() => setState({ selectedDiscussionId: null, responses: [], loading: false })}
        />
      ) : (
        <div className="p-3 flex-1 overflow-hidden flex flex-col">
          <DiscussionList
            discussions={discussions}
            onSelect={(id) => setState({ selectedDiscussionId: id, responses: [], loading: false })}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SplitView
// ---------------------------------------------------------------------------

export function SplitView({
  discussions,
  onBack,
  liveActiveDiscussionId,
  liveActiveResponses = [],
}: Readonly<SplitViewProps>) {
  const [mobileActivePane, setMobileActivePane] = React.useState<'left' | 'right'>('left');

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface-base"
    >
      {/* Top bar */}
      <header
        className="glass flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-line-subtle"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 bg-surface-raised text-content-secondary border border-line-default"
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = 'var(--color-primary-400)';
              btn.style.color = 'var(--color-primary-600)';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.borderColor = 'var(--border-default)';
              btn.style.color = 'var(--text-secondary)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back <span className="hidden sm:inline">to Session</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <AppLogo size="sm" className="hidden xs:block" />
          <div className="hidden xs:block w-px h-4 bg-line-default mx-1" />
          <span
            className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest text-brand-600"
            style={{ background: 'rgba(45,158,45,0.12)' }}
          >
            Split View
          </span>
        </div>

        {/* Mobile Pane Switcher */}
        <div className="lg:hidden flex items-center bg-muted/30 p-1 rounded-xl border border-line-subtle">
           <button 
             onClick={() => setMobileActivePane('left')}
             className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300 ${mobileActivePane === 'left' ? 'bg-surface-base text-brand-600 shadow-sm' : 'text-content-muted'}`}
           >
             Left
           </button>
           <button 
             onClick={() => setMobileActivePane('right')}
             className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all duration-300 ${mobileActivePane === 'right' ? 'bg-surface-base text-brand-600 shadow-sm' : 'text-content-muted'}`}
           >
             Right
           </button>
        </div>
        <div className="hidden lg:block w-[120px]" /> {/* Spacer for desktop symmetry */}
      </header>

      {/* Pane Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop: both visible | Mobile: only active visible */}
        <div className={`flex-1 flex min-w-0 ${mobileActivePane !== 'left' ? 'hidden lg:flex' : 'flex'}`}>
          <Pane
            label="Left Pane"
            discussions={discussions}
            liveActiveDiscussionId={liveActiveDiscussionId}
            liveActiveResponses={liveActiveResponses}
          />
        </div>
        
        <div className={`flex-1 flex min-w-0 ${mobileActivePane !== 'right' ? 'hidden lg:flex' : 'flex'}`}>
          <Pane
            label="Right Pane"
            discussions={discussions}
            liveActiveDiscussionId={liveActiveDiscussionId}
            liveActiveResponses={liveActiveResponses}
          />
        </div>
      </div>
    </div>
  );
}
