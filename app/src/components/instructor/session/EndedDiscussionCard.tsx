// Card displaying a single closed discussion in the post-session review view.
// Extracted from SessionEndedView.tsx — has its own state (expand toggle,
// analytics modal, loading flag) and a fetch call, making it complex enough to
// warrant its own file.
//
// Behaviour:
//   - Shows prompt text, response count, response rate, and participant snapshot.
//   - "View Analytics" opens DiscussionAnalyticsModal (fetches fresh responses on click).
//   - "Show / Hide Responses" expands an inline list of raw response texts.
'use client';

import * as React from 'react';
import type { SessionVM } from '@/hooks/useSessionPage';
import type { Response } from '@/types/response';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';
import { DiscussionAnalyticsModal } from './DiscussionAnalyticsModal';

import { RestartDiscussionButton } from './RestartDiscussionButton';
import type { Discussion as GlobalDiscussion } from '@/types/discussion';

type Discussion = SessionVM['lessonDiscussions'][number];

export function EndedDiscussionCard({
  discussion,
  index,
  total,
  lessonId,
  lessonStatus,
  onRestart,
}: Readonly<{
  discussion: Discussion;
  index: number;
  total: number;
  lessonId?: string;
  lessonStatus?: string;
  onRestart?: SessionVM['handleRestartDiscussion'];
}>) {
  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);
  const [modalResponses, setModalResponses] = React.useState<Response[]>([]);
  const [loadingResponses, setLoadingResponses] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const responses = discussion.responses || [];
  const responseCount = responses.length;
  const uniqueRespondents = new Set(responses.map(r => r.student_session_id).filter(Boolean)).size;
  const presenceSnapshot = discussion.participant_snapshot ?? 0;
  const snapshot = presenceSnapshot > 0 ? Math.max(presenceSnapshot, uniqueRespondents) : 0;
  const responseRate = snapshot > 0
    ? Math.round((uniqueRespondents / snapshot) * 100)
    : null;

  // Fetches the full response list (including flagged) before opening the analytics modal.
  async function openAnalytics() {
    setLoadingResponses(true);
    try {
      const data = await fetchResponsesApi(discussion.id, true);
      setModalResponses(data);
      setAnalyticsOpen(true);
    } finally {
      setLoadingResponses(false);
    }
  }

  return (
    <div
      className="glass rounded-2xl transition-shadow hover:shadow-md"
      style={{ padding: '16px' }}
    >
      {/* Top row: prompt number badge + closed tag + timestamp */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
            Prompt #{total - index}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-raised text-content-muted"
          >
            Closed
          </span>
        </div>
        <span className="text-xs shrink-0 text-content-muted">
          {new Date(discussion.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Prompt text */}
      <p className="text-sm font-medium mb-3 leading-snug text-content-primary">
        {discussion.prompt_text}
      </p>

      {/* Stats: response count, response rate, participant snapshot */}
      <div className="flex items-center gap-3 text-xs mb-3 text-content-muted">
        <span className="flex items-center gap-1">
          <span className="font-semibold text-content-secondary">{responseCount}</span> responses
        </span>
        {responseRate !== null && (
          <span className="flex items-center gap-1">
            <span className="font-semibold text-content-secondary">{responseRate}%</span> rate
          </span>
        )}
        {snapshot > 0 && (
          <span className="flex items-center gap-1">
            <span className="font-semibold text-content-secondary">{snapshot}</span> students
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={openAnalytics}
          disabled={loadingResponses}
          className="text-xs h-7 px-3 rounded-[8px] font-medium transition-all duration-150 disabled:opacity-50 bg-surface-raised border border-line-default text-content-secondary"
        >
          {loadingResponses ? 'Loading…' : 'View Analytics'}
        </button>

        {onRestart && (
          <RestartDiscussionButton
            discussion={discussion as unknown as GlobalDiscussion}
            onRestart={onRestart}
            isLessonActive={lessonStatus === 'active'}
            size="sm"
            showText={true}
            className="text-xs h-7 px-3 font-semibold border-brand-500 text-brand-500 bg-surface-base hover:bg-brand-500/10"
          />
        )}
        {/* Word Cloud link — only shown for free-text discussions (short/long answer) that have
            at least one response and a known lessonId. Opens the interactive word cloud page in
            a new tab so the instructor can keep the session view open alongside it. */}
        {lessonId && responseCount > 0 &&
          (discussion.prompt_type === 'short_answer' || discussion.prompt_type === 'long_answer') && (
          <a
            href={`/session/${lessonId}/word-cloud/${discussion.id}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="word-cloud-link"
            className="text-xs h-7 px-3 rounded-[8px] font-medium transition-all duration-150 inline-flex items-center gap-1 bg-surface-raised border border-line-default text-content-secondary hover:text-content-primary"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
            Word Cloud
          </a>
        )}
        {responseCount > 0 && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs h-7 px-3 rounded-[8px] font-medium transition-all duration-150 text-content-muted"
            style={{ background: 'transparent' }}
          >
            {expanded ? 'Hide Responses' : `Show Responses (${responseCount})`}
          </button>
        )}
      </div>

      {/* Inline response list (toggled by "Show Responses") */}
      {expanded && responseCount > 0 && (
        <div
          className="mt-3 space-y-2 pt-3 border-t border-line-subtle"
        >
          {responses.map((r: { id: string; response_text: string; created_at: string }) => (
            <div key={r.id} className="rounded-xl p-2.5 bg-surface-raised">
              <p className="text-sm text-content-secondary">{r.response_text}</p>
              <p className="text-xs mt-1 text-content-muted">
                {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}

      <DiscussionAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        discussion={discussion}
        responses={modalResponses}
        studentCount={snapshot ?? 0}
        lessonId={lessonId}
      />
    </div>
  );
}
