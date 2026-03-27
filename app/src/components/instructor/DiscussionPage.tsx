// Client component for the instructor's discussion detail page.
// Shows the prompt, MC option distribution (if applicable), and a live-updating response list.
'use client';

import { useRealtime } from '@/lib/realtime/useRealtime';
import { useState, useEffect, useCallback } from 'react';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DiscussionAnalyticsContent } from '@/components/instructor/session/DiscussionAnalyticsModal';
import { flagResponseApi, unflagResponseApi } from '@/lib/api/discussionsApi';
import { useResponseSelection } from '@/hooks/useResponseSelection';
import { ResponseCard } from '@/components/instructor/ResponseCard';
import { ExpandableCard } from '@/components/instructor/ExpandableCard';
import { FlaggedFilterToggle } from '@/components/instructor/FlaggedFilterToggle';
import { ResponseStatusBar } from '@/components/instructor/ResponseStatusBar';

/** Isolated response list — owns its own selection state so clicks don't re-render the whole page. */
function ResponseList({ responses, flaggedResponses, onRemoveResponse, onRestoreResponse, canFlag, isConnected }: Readonly<{
  responses: Response[];
  flaggedResponses: Response[];
  onRemoveResponse: (id: string) => void;
  onRestoreResponse: (id: string) => Promise<void>;
  canFlag: boolean;
  isConnected: boolean;
}>) {
  const {
    selectedIds, flaggingId, showHighlightedOnly,
    toggleSelected, handleFlagInappropriate,
    setShowHighlightedOnly, filterResponses,
  } = useResponseSelection({
    onRemove: async (responseId) => {
      await flagResponseApi(responseId);
      onRemoveResponse(responseId);
    },
  });

  const [showFlagged, setShowFlagged] = useState(false);

  // Auto-switch back to normal view when all flagged responses are restored
  useEffect(() => {
    if (flaggedResponses.length === 0 && showFlagged) {
      setShowFlagged(false);
    }
  }, [flaggedResponses.length, showFlagged]);

  // Separate selection/flagging state for the flagged view
  const [flaggedSelectedIds, setFlaggedSelectedIds] = useState<string[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const toggleFlaggedSelected = useCallback((id: string) => {
    setFlaggedSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const handleRestore = async (responseId: string) => {
    setRestoringId(responseId);
    try {
      await onRestoreResponse(responseId);
      setFlaggedSelectedIds(prev => prev.filter(x => x !== responseId));
    } catch (err) {
      console.error('Failed to restore response:', err);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="grid gap-4">
      {/* Status bar: realtime connection + total count + inline highlight filter */}
      <ResponseStatusBar
        isConnected={isConnected}
        selectedCount={!showFlagged ? selectedIds.length : 0}
        showHighlightedOnly={showHighlightedOnly}
        onToggleHighlight={() => setShowHighlightedOnly(prev => !prev)}
      />

      {/* Flagged toggle — appears when flagged responses exist */}
      {flaggedResponses.length > 0 && (
        <FlaggedFilterToggle
          variant="full"
          flaggedCount={flaggedResponses.length}
          showFlagged={showFlagged}
          onToggle={() => setShowFlagged(prev => !prev)}
          onHide={() => setShowFlagged(false)}
        />
      )}

      {/* Normal view — active responses */}
      {!showFlagged && filterResponses(responses).map((resp) => (
        <ResponseCard
          key={resp.id}
          variant="full"
          responseText={resp.response_text}
          createdAt={resp.created_at}
          isSelected={selectedIds.includes(resp.id)}
          isBeingFlagged={flaggingId === resp.id}
          onToggle={() => toggleSelected(resp.id)}
          onFlag={canFlag ? () => void handleFlagInappropriate(resp.id) : undefined}
        />
      ))}

      {/* Flagged view — shows only flagged responses in red with Unflag action */}
      {showFlagged && flaggedResponses.map((resp) => (
        <ResponseCard
          key={resp.id}
          variant="full"
          mode="flagged"
          responseText={resp.response_text}
          createdAt={resp.created_at}
          isSelected={flaggedSelectedIds.includes(resp.id)}
          isBeingFlagged={restoringId === resp.id}
          onToggle={() => toggleFlaggedSelected(resp.id)}
          onFlag={() => void handleRestore(resp.id)}
        />
      ))}
    </div>
  );
}


interface DiscussionClientProps {
  lessonId: string;
  discussionId: string;
  initialDiscussion: Discussion;
  initialResponses: Response[];
  initialFlaggedResponses: Response[];
  initialIsActive: boolean;
}

/**
 * Displays a discussion's prompt, MC answer distribution, realtime connection status,
 * and a scrollable list of student responses that updates via Supabase Realtime.
 */
export function DiscussionPage({
  lessonId,
  discussionId,
  initialDiscussion,
  initialResponses,
  initialFlaggedResponses,
  initialIsActive
}: Readonly<DiscussionClientProps>) {

  // ── Initialize State with Server Data (Hydration) ──────────────────────────
  // Server-fetched data is seeded into useState so that realtime updates can
  // mutate it without triggering a full server re-fetch. Using server data
  // directly (without useState) would freeze the list after the initial render.
  const [responses, setResponses] = useState<Response[]>(initialResponses);
  const [flaggedResponses, setFlaggedResponses] = useState<Response[]>(initialFlaggedResponses);
  const [isActive] = useState(initialIsActive);

  const handleRemoveResponse = useCallback((responseId: string) => {
    // Capture the response via a functional updater (runs synchronously inside setResponses),
    // then add it to flaggedResponses at the top level. React 18+ batches both setState
    // calls into a single render, preventing duplicate keys during the transition.
    let flaggedItem: Response | undefined;
    setResponses((prev) => {
      flaggedItem = prev.find((r) => r.id === responseId);
      return prev.filter((r) => r.id !== responseId);
    });
    if (flaggedItem) {
      const item = flaggedItem;
      setFlaggedResponses((prev) => {
        // Deduplicate just in case — Supabase Realtime can replay broadcast events
        // on reconnect, so the same response may arrive more than once.
        if (prev.some((r) => r.id === responseId)) return prev;
        return [{ ...item, flagged_at: new Date().toISOString() }, ...prev];
      });
    }
  }, []);

  const handleRestoreResponse = useCallback(async (responseId: string) => {
    await unflagResponseApi(responseId);
    // Same functional-updater + React 18 batching pattern as handleRemoveResponse:
    // capture the item synchronously inside the updater, then add it to the live list.
    let restoredItem: Response | undefined;
    setFlaggedResponses((prev) => {
      restoredItem = prev.find((r) => r.id === responseId);
      return prev.filter((r) => r.id !== responseId);
    });
    if (restoredItem) {
      const item = restoredItem;
      setResponses((prev) => {
        // Deduplicate just in case — Supabase Realtime can deliver the same event
        // more than once after a reconnect.
        if (prev.some((r) => r.id === responseId)) return prev;
        return [{ ...item, flagged_at: null }, ...prev];
      });
    }
  }, []);

  const { channel, isConnected } = useRealtime(lessonId, 'instructor');

  const handleNewResponse = useCallback((payload: { payload?: { response?: Response } }) => {
    const newResponse = payload.payload?.response;
    if (newResponse?.discussion_id === discussionId) {
      setResponses((prev) => {
        // Deduplicate just in case — Supabase Realtime can deliver the same broadcast
        // event twice on reconnect. Returning prev skips the re-render entirely.
        if (prev.some(r => r.id === newResponse.id)) return prev;
        return [newResponse, ...prev];
      });
    }
  }, [discussionId]);

  useEffect(() => {
    if (!channel || !isConnected) return;

    channel.on('broadcast', { event: 'response:new' }, handleNewResponse);
  }, [channel, isConnected, handleNewResponse]);

  const isMC = initialDiscussion.prompt_type === 'multiple_choice';
  const [selectedMCOption, setSelectedMCOption] = useState<string | null>(null);

  const distribution: Record<string, number> = {};
  if (isMC && initialDiscussion.mc_options) {
    initialDiscussion.mc_options.forEach(opt => {
      distribution[opt.label] = 0;
    });
    responses.forEach(r => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }

  const correctOptionLabel = initialDiscussion.correct_option;
  const correctOptionText = correctOptionLabel
    ? initialDiscussion.mc_options?.find((opt) => opt.label === correctOptionLabel)?.text ?? null
    : null;

  const studentCount = initialDiscussion.participant_snapshot ?? 0;

  return (
    <div
      className="min-h-screen bg-surface-base"
    >
      <div className="w-2/3 mx-auto p-4 md:p-8">
        {/* Back navigation */}
        <div className="mb-6">
          <Link
            href={`/session/${lessonId}`}
            className="inline-flex items-center text-sm font-medium transition-colors duration-150 text-content-muted"
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-primary-500)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lesson Dashboard
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT COLUMN: Analytics */}
          <div
            className="w-full lg:w-1/3 shrink-0 lg:sticky lg:top-8 p-6 rounded-2xl"
            style={{
              background: 'var(--surface-glass)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h2
              className="text-lg font-bold mb-4 pb-3 text-content-primary border-b border-line-subtle"
            >
              Metrics
            </h2>
            {/* lessonId is required so the ExternalLink button in DiscussionAnalyticsContent
                opens the interactive word cloud page (/session/[lessonId]/word-cloud/[discussionId])
                instead of falling back to the static HTML popup. */}
            <DiscussionAnalyticsContent
              discussion={initialDiscussion}
              responses={responses}
              studentCount={studentCount}
              lessonId={lessonId}
            />
          </div>

          {/* RIGHT COLUMN: Question and Responses */}
          <div className="flex-1 w-full min-w-0">
            {/* Header */}
            <div
              className="flex flex-col gap-4 mb-6 pb-6 border-b border-line-default"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                  <h1
                    className="text-2xl font-bold leading-tight text-content-primary"
                  >
                    {initialDiscussion.prompt_text}
                  </h1>
                </div>

                {/* Status badge */}
                <div
                  className="shrink-0 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide flex items-center gap-2"
                  style={isActive ? {
                    background: 'rgba(45,158,45,0.12)',
                    border: '1px solid rgba(45,158,45,0.35)',
                    color: 'var(--color-primary-500)',
                  } : {
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {isActive ? (
                    <>
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: 'var(--color-primary-500)' }}
                      />
                      {' '}Active
                    </>
                  ) : (
                    <>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--text-muted)' }}
                      />
                      {' '}Closed
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* MC Options */}
            {isMC && initialDiscussion.mc_options && (
              <div
                className="mb-8 p-6 rounded-2xl"
                style={{
                  background: 'var(--surface-glass)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-content-primary">
                    Multiple Choice Options
                  </h3>
                  {correctOptionLabel && (
                    <span
                      className="text-xs font-medium px-3 py-1 rounded-full"
                      style={{ background: 'rgba(45,158,45,0.12)', color: 'var(--color-primary-500)' }}
                    >
                      Correct: {correctOptionLabel}. {correctOptionText ?? '(unavailable)'}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {initialDiscussion.mc_options.map((opt) => {
                    const count = distribution[opt.label] || 0;
                    const isCorrect = initialDiscussion.correct_option === opt.label;
                    const isSelected = selectedMCOption === opt.label;

                    const badge = (
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
                        style={isCorrect ? {
                          background: 'var(--color-primary-500)',
                          color: 'white',
                        } : isSelected ? {
                          background: 'var(--color-highlight-alpha-55)',
                          color: 'var(--text-primary)',
                        } : {
                          background: 'var(--surface-overlay)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {opt.label}
                      </span>
                    );

                    const selectedStyle = isCorrect ? {
                      background: 'rgba(45,158,45,0.12)',
                      border: '2px solid var(--color-primary-500)',
                      boxShadow: '0 4px 24px rgba(45,158,45,0.12)',
                    } : {
                      background: 'var(--color-highlight-alpha-10)',
                      border: '2px solid var(--color-highlight-alpha-55)',
                      boxShadow: '0 4px 24px var(--color-highlight-alpha-12)',
                    };

                    const unselectedStyle = isCorrect ? {
                      background: 'rgba(45,158,45,0.08)',
                      border: '2px solid var(--color-primary-500)',
                    } : {
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-default)',
                    };

                    return (
                      <ExpandableCard
                        key={opt.label}
                        badge={badge}
                        text={opt.text}
                        rightLabel={<span className="text-sm font-semibold text-content-muted">{count} {count === 1 ? 'response' : 'responses'}</span>}
                        isSelected={isSelected}
                        onClick={() => setSelectedMCOption(isSelected ? null : opt.label)}
                        padding="12px 16px"
                        selectedStyle={selectedStyle}
                        unselectedStyle={unselectedStyle}
                        selectedTextClassName={`text-3xl font-semibold leading-relaxed ${isCorrect ? 'text-[var(--color-primary-500)]' : 'text-content-primary'}`}
                        unselectedTextClassName={`text-sm ${isCorrect ? 'font-medium text-[var(--color-primary-500)]' : 'text-[var(--text-secondary)]'}`}
                        ariaLabel={isSelected ? 'Deselect option' : 'Select option'}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Responses List — hidden for MC since distribution is shown in the options section above */}
            {!isMC && (
              <div className="space-y-4">
                {responses.length === 0 && flaggedResponses.length === 0 ? (
                  <>
                    <ResponseStatusBar isConnected={isConnected} />
                    <div
                      className="text-center p-12 rounded-2xl bg-surface-raised text-content-muted"
                      style={{ border: '2px dashed var(--border-default)' }}
                    >
                      <p>No responses recorded yet.</p>
                    </div>
                  </>
                ) : (
                  <ResponseList
                    responses={responses}
                    flaggedResponses={flaggedResponses}
                    onRemoveResponse={handleRemoveResponse}
                    onRestoreResponse={handleRestoreResponse}
                    canFlag={true}
                    isConnected={isConnected}
                  />
                )}
              </div>
            )}

            {/* MC: realtime status only (no individual response cards — distribution shown above) */}
            {isMC && (
              <ResponseStatusBar isConnected={isConnected} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
