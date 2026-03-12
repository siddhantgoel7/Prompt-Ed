// Post-session review page showing all discussions with responses, transcript segments,
// and uploaded lecture files. Includes a Split View and export controls.
'use client';

import * as React from 'react';
import { SessionHeaderEnded } from '@/components/instructor/session/SessionHeaderEnded';
import { SplitView } from '@/components/instructor/session/SplitView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SessionVM } from '@/hooks/useSessionPage';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';
import { SessionContext, SessionProvider } from './SessionContext';
import { DiscussionAnalyticsModal } from './DiscussionAnalyticsModal';

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

function SummaryBar({
  totalDiscussions,
  totalResponses,
  startedAt,
  endedAt,
}: {
  totalDiscussions: number;
  totalResponses: number;
  startedAt?: string | null;
  endedAt?: string | null;
}) {
  const duration = React.useMemo(() => {
    if (!startedAt || !endedAt) return null;
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  }, [startedAt, endedAt]);

  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-gray-100 bg-gray-50">
      <div className="flex flex-col items-center justify-center py-2">
        <span className="text-2xl font-bold text-gray-900">{totalDiscussions}</span>
        <span className="text-xs text-gray-500 mt-0.5">Discussions</span>
      </div>
      <div className="flex flex-col items-center justify-center py-2 border-x border-gray-200">
        <span className="text-2xl font-bold text-gray-900">{totalResponses}</span>
        <span className="text-xs text-gray-500 mt-0.5">Total Responses</span>
      </div>
      <div className="flex flex-col items-center justify-center py-2">
        <span className="text-2xl font-bold text-gray-900">{duration ?? '—'}</span>
        <span className="text-xs text-gray-500 mt-0.5">Session Duration</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discussion cards for ended view
// ---------------------------------------------------------------------------

function EndedDiscussionCard({
  discussion,
  index,
  total,
}: {
  discussion: SessionVM['lessonDiscussions'][number];
  index: number;
  total: number;
}) {
  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);
  const [modalResponses, setModalResponses] = React.useState<Response[]>([]);
  const [loadingResponses, setLoadingResponses] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const responses = discussion.responses || [];
  const responseCount = responses.length;
  const snapshot = discussion.participant_snapshot;
  const responseRate = snapshot && snapshot > 0
    ? Math.round((responseCount / snapshot) * 100)
    : null;

  async function openAnalytics() {
    setLoadingResponses(true);
    const data = await fetchResponsesApi(discussion.id, true);
    setModalResponses(data);
    setLoadingResponses(false);
    setAnalyticsOpen(true);
  }

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Prompt #{total - index}
            </span>
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px]">
              Closed
            </Badge>
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {new Date(discussion.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Prompt text */}
        <p className="text-sm font-medium text-gray-800 mb-3 leading-snug">
          {discussion.prompt_text}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-gray-700">{responseCount}</span> responses
          </span>
          {responseRate !== null && (
            <span className="flex items-center gap-1">
              <span className="font-semibold text-gray-700">{responseRate}%</span> rate
            </span>
          )}
          {snapshot && (
            <span className="flex items-center gap-1">
              <span className="font-semibold text-gray-700">{snapshot}</span> students
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 px-3"
            onClick={openAnalytics}
            disabled={loadingResponses}
          >
            {loadingResponses ? 'Loading…' : 'View Analytics'}
          </Button>
          {responseCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-3 text-gray-500"
              onClick={() => setExpanded((p) => !p)}
            >
              {expanded ? 'Hide Responses' : `Show Responses (${responseCount})`}
            </Button>
          )}
        </div>

        {/* Inline response list */}
        {expanded && responseCount > 0 && (
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            {responses.map((r: { id: string; response_text: string; created_at: string }) => (
              <div key={r.id} className="bg-gray-50 rounded-md p-2.5">
                <p className="text-sm text-gray-700">{r.response_text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <DiscussionAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        discussion={discussion}
        responses={modalResponses}
        studentCount={snapshot ?? 0}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SessionEndedView
// ---------------------------------------------------------------------------

/** Renders the ended-session summary layout with discussions, transcripts, and lecture material sections. */
export function SessionEndedView(props: { vm?: SessionVM }) {
  const context = React.useContext(SessionContext);
  const vm = context || props.vm!;
  const lesson = vm.lesson;
  const transcripts = vm.transcripts ?? [];
  const transcriptsLoading = vm.transcriptsLoading ?? false;
  const transcriptsError = vm.transcriptsError ?? null;
  const files = vm.files ?? [];

  const [splitView, setSplitView] = React.useState(false);

  const discussionsForSplit: DiscussionWithResponseCount[] = React.useMemo(
    () =>
      vm.lessonDiscussions.map((d) => ({
        ...d,
        response_count: (d.responses || []).length,
      })),
    [vm.lessonDiscussions],
  );

  const totalResponses = React.useMemo(
    () => vm.lessonDiscussions.reduce((sum, d) => sum + (d.responses || []).length, 0),
    [vm.lessonDiscussions],
  );

  const reversedDiscussions = React.useMemo(
    () => [...vm.lessonDiscussions].reverse(),
    [vm.lessonDiscussions],
  );

  if (splitView) {
    const splitContent = (
      <SplitView
        discussions={discussionsForSplit}
        lessonId={lesson.id}
        onBack={() => setSplitView(false)}
      />
    );
    return context ? splitContent : <SessionProvider vm={vm}>{splitContent}</SessionProvider>;
  }

  const content = (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SessionHeaderEnded onSplitView={() => setSplitView(true)} />

      <SummaryBar
        totalDiscussions={vm.lessonDiscussions.length}
        totalResponses={totalResponses}
        startedAt={(lesson as unknown as { started_at?: string }).started_at}
        endedAt={(lesson as unknown as { ended_at?: string }).ended_at}
      />

      <main className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

        {/* Left — Discussions */}
        <section className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Discussions</h2>
            <span className="text-xs text-gray-400">{vm.lessonDiscussions.length} prompts</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {vm.historyLoading && (
              <p className="text-sm text-gray-500">Loading lesson history...</p>
            )}
            {vm.historyError && (
              <p className="text-sm text-red-600">{vm.historyError}</p>
            )}
            {!vm.historyLoading && !vm.historyError && reversedDiscussions.length === 0 && (
              <p className="text-sm text-gray-500">No discussions recorded.</p>
            )}
            {!vm.historyLoading &&
              !vm.historyError &&
              reversedDiscussions.map((d, i) => (
                <EndedDiscussionCard
                  key={d.id}
                  discussion={d}
                  index={i}
                  total={vm.lessonDiscussions.length}
                />
              ))}
          </div>
        </section>

        {/* Right — Transcript + Lecture Material */}
        <div className="grid grid-rows-2 gap-6 min-h-0">

          <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3 shrink-0">Transcript</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {transcriptsLoading && (
                <p className="text-sm text-gray-500">Loading transcripts...</p>
              )}
              {transcriptsError && (
                <p className="text-sm text-red-600">{transcriptsError}</p>
              )}
              {!transcriptsLoading && !transcriptsError && transcripts.length === 0 && (
                <p className="text-sm text-gray-500">No transcripts used.</p>
              )}
              {transcripts.map((t, i) => (
                <div key={t.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Segment {i + 1} · {new Date(t.metadata?.recordedAt ?? t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {t.content}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col min-h-0 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-3 shrink-0">Lecture Material</h2>
            <div className="flex-1 overflow-y-auto space-y-2">
              {files.length === 0 ? (
                <p className="text-sm text-gray-500">No lecture material uploaded.</p>
              ) : (
                files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.fileName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {f.fileType.toUpperCase()} · {new Date(f.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-3 shrink-0 ml-3"
                      onClick={() => vm.openFile(f.id)}
                    >
                      Download
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );

  return context ? content : <SessionProvider vm={vm}>{content}</SessionProvider>;
}