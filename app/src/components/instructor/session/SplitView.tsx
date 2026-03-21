'use client';

// Full-screen split view overlay that renders two independent discussion-browsing panes
// side by side, each with its own realtime response subscription.
//
// Logical sections (in order):
//   Types          — SplitViewProps, PaneState
//   DiscussionList — tab UI listing active/closed discussions; clicking one selects it
//   DiscussionDetail — prompt text, status badge, and scrollable response list
//   Pane           — one half of the split; owns selection state + realtime subscription
//   SplitView      — full-screen layout: header + two Panes

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLogo } from '@/components/ui/AppLogo';

import { useRealtime } from '@/lib/realtime/useRealtime';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import { truncateText } from '@/lib/utils';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SplitViewProps {
  discussions: DiscussionWithResponseCount[];
  lessonId: string;
  onBack: () => void;
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
}: {
  discussions: DiscussionWithResponseCount[];
  onSelect: (id: string) => void;
}) {
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
            <p className="text-sm leading-relaxed mb-1.5 text-content-primary">
              {truncateText(d.prompt_text)}
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
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="w-full mb-3">
        <TabsTrigger value="active" className="flex-1 text-xs">Active ({active.length})</TabsTrigger>
        <TabsTrigger value="closed" className="flex-1 text-xs">Closed ({closed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-0">
        <ScrollArea className="h-[calc(100vh-170px)]">
          {renderList(active)}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="closed" className="mt-0">
        <ScrollArea className="h-[calc(100vh-170px)]">
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
}: {
  discussion: DiscussionWithResponseCount;
  responses: Response[];
  loading: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div
        className="px-4 pt-3 pb-3 flex-shrink-0 border-b border-line-subtle"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium mb-3 transition-colors duration-150 text-content-muted"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
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

        <p className="text-sm font-medium leading-relaxed mb-2 text-content-primary">
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

      {/* Responses */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton-shimmer h-16 w-full rounded-xl" />
            <div className="skeleton-shimmer h-16 w-full rounded-xl" />
          </div>
        ) : responses.length === 0 ? (
          <p className="text-sm py-6 text-center text-content-muted">
            No responses yet.
          </p>
        ) : (
          <div className="space-y-2">
            {responses.map((r) => (
              <div
                key={r.id}
                className="rounded-xl p-3 bg-surface-raised border border-line-subtle"
              >
                <p className="text-sm text-content-primary">
                  {r.response_text}
                </p>
                <p className="text-xs mt-1 text-content-muted">
                  {new Date(r.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pane
// ---------------------------------------------------------------------------

/** One half of the split view — manages its own selected discussion and realtime responses. */
function Pane({
  label,
  discussions,
  lessonId,
}: {
  label: string;
  discussions: DiscussionWithResponseCount[];
  lessonId: string;
}) {
  const [state, setState] = React.useState<PaneState>({
    selectedDiscussionId: null,
    responses: [],
    loading: false,
  });

  const { channel, isConnected } = useRealtime(lessonId, 'instructor');

  // Fetch responses whenever the selected discussion changes.
  // `cancelled` is a closure flag that prevents stale async results from a previous
  // selection from overwriting the new selection's state after the effect cleans up.
  React.useEffect(() => {
    if (!state.selectedDiscussionId) return;

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
  }, [state.selectedDiscussionId]);

  // `selectedIdRef` mirrors state.selectedDiscussionId so that the realtime broadcast
  // handler below can read the current selected ID without being recreated every time
  // the selection changes (the handler is registered once, on mount).
  const selectedIdRef = React.useRef(state.selectedDiscussionId);
  React.useEffect(() => {
    selectedIdRef.current = state.selectedDiscussionId;
  }, [state.selectedDiscussionId]);

  // Subscribe to realtime response broadcasts for this pane.
  // The listener is intentionally NOT returned with an unsubscribe — Supabase channel
  // cleanup is handled at the hook level in useRealtime when the component unmounts.
  React.useEffect(() => {
    if (!channel || !isConnected) return;

    channel.on('broadcast', { event: 'response:new' }, (payload: { payload?: { response?: Response } }) => {
      const newResponse = payload.payload?.response;
      if (newResponse && newResponse.discussion_id === selectedIdRef.current) {
        setState((prev) => {
          // Deduplicate just in case — Supabase Realtime can replay broadcast events on reconnect.
          if (prev.responses.some((r) => r.id === newResponse.id)) return prev;
          return { ...prev, responses: [...prev.responses, newResponse] };
        });
      }
    });
  }, [channel, isConnected]);

  const selectedDiscussion = discussions.find((d) => d.id === state.selectedDiscussionId) ?? null;

  return (
    <div
      className="flex-1 flex flex-col min-w-0 border-r border-line-default"
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
          responses={state.responses}
          loading={state.loading}
          onBack={() => setState({ selectedDiscussionId: null, responses: [], loading: false })}
        />
      ) : (
        <div className="p-3 flex-1 overflow-hidden">
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

/** Full-screen overlay rendering two Panes side by side for simultaneous discussion monitoring. */
export function SplitView({ discussions, lessonId, onBack }: SplitViewProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface-base"
    >
      {/* Top bar */}
      <header
        className="glass flex-shrink-0 px-4 py-2.5 flex items-center justify-between"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-150 bg-surface-raised text-content-secondary"
          style={{
            border: '1px solid var(--border-default)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-400)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to Session
        </button>

        <AppLogo size="sm" />

        <span
          className="text-xs font-semibold px-3 py-1.5 rounded-full text-brand-600"
          style={{ background: 'rgba(45,158,45,0.12)' }}
        >
          Split View
        </span>
      </header>

      {/* Two panes */}
      <div className="flex-1 flex min-h-0">
        <Pane label="Left Pane" discussions={discussions} lessonId={lessonId} />
        <Pane label="Right Pane" discussions={discussions} lessonId={lessonId} />
      </div>
    </div>
  );
}