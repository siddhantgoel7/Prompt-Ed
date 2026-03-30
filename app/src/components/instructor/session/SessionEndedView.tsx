// Post-session review page showing all discussions with responses, transcript segments,
// and uploaded lecture files. Includes a Split View and export controls.
//
// EndedDiscussionCard is extracted to EndedDiscussionCard.tsx — it has its own
// state (expand toggle, analytics modal, loading flag) and a fetch call, making
// it complex enough to warrant its own file.
'use client';

import * as React from 'react';
import { SessionHeaderEnded } from '@/components/instructor/session/SessionHeaderEnded';
import { SplitView } from '@/components/instructor/session/SplitView';
import { Button } from '@/components/ui/button';
import type { SessionVM } from '@/hooks/useSessionPage';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import { SessionContext, SessionProvider } from './SessionContext';
import { EndedDiscussionCard } from './EndedDiscussionCard';
import { Trophy, MessageSquare, Clock } from 'lucide-react';

// ---------------------------------------------------------------------------
// Summary bar
// ---------------------------------------------------------------------------

function SummaryBar({
  totalDiscussions,
  totalResponses,
  startedAt,
  endedAt,
}: Readonly<{
  totalDiscussions: number;
  totalResponses: number;
  startedAt?: string | null;
  endedAt?: string | null;
}>) {
  const duration = React.useMemo(() => {
    if (!startedAt || !endedAt) return null;
    const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  }, [startedAt, endedAt]);

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-6 border-b border-line-default bg-surface-raised/50"
    >
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 transition-all duration-300 hover:bg-brand-500/10">
        <Trophy className="w-5 h-5 mb-2 text-brand-600 opacity-80" />
        <span className="text-3xl font-black tracking-tight text-content-primary">{totalDiscussions}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-content-muted">Discussions</span>
      </div>
      <div
        className="flex flex-col items-center justify-center p-4 rounded-2xl bg-primary-500/5 border border-primary-500/10 transition-all duration-300 hover:bg-primary-500/10"
      >
        <MessageSquare className="w-5 h-5 mb-2 text-primary-600 opacity-80" />
        <span className="text-3xl font-black tracking-tight text-content-primary">{totalResponses}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-content-muted">Total Responses</span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 transition-all duration-300 hover:bg-amber-500/10">
        <Clock className="w-5 h-5 mb-2 text-amber-600 opacity-80" />
        <span className="text-3xl font-black tracking-tight text-content-primary">{duration ?? '—'}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-content-muted">Duration</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionEndedView
// ---------------------------------------------------------------------------

/** Renders the ended-session summary layout with discussions, transcripts, and lecture material sections. */
export function SessionEndedView(props: Readonly<{ vm?: SessionVM }>) {
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
    <div className="h-screen flex flex-col bg-surface-base">
      <SessionHeaderEnded onSplitView={() => setSplitView(true)} />

      {vm.endError && (
        <div className="px-6 pt-4">
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderLeft: '3px solid #ef4444',
              color: '#ef4444',
            }}
          >
            {vm.endError}
          </div>
        </div>
      )}

      <SummaryBar
        totalDiscussions={vm.lessonDiscussions.length}
        totalResponses={totalResponses}
        startedAt={(lesson as unknown as { started_at?: string }).started_at}
        endedAt={(lesson as unknown as { ended_at?: string }).ended_at}
      />

      <main className="px-4 sm:px-6 flex-1 overflow-y-auto lg:overflow-hidden min-h-0">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-full lg:min-h-0 py-6">

        {/* Left — Discussions */}
        <section className="flex flex-col min-h-[450px] lg:min-h-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-content-primary">Discussions</h2>
            <span className="text-xs text-content-muted">{vm.lessonDiscussions.length} prompts</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {vm.historyLoading && (
              <p className="text-sm text-content-muted">Loading lesson history...</p>
            )}
            {vm.historyError && (
              <p className="text-sm text-err-500">{vm.historyError}</p>
            )}
            {!vm.historyLoading && !vm.historyError && reversedDiscussions.length === 0 && (
              <p className="text-sm text-content-muted">No discussions recorded.</p>
            )}
            {!vm.historyLoading &&
              !vm.historyError &&
              reversedDiscussions.map((d, i) => (
                <EndedDiscussionCard
                  key={d.id}
                  discussion={d}
                  index={i}
                  total={vm.lessonDiscussions.length}
                  lessonId={lesson.id}
                />
              ))}
          </div>
        </section>

        {/* Right — Transcript + Lecture Material */}
        <div className="flex flex-col lg:grid lg:grid-rows-2 gap-6 lg:min-h-0">

          <section
            className="rounded-2xl p-4 flex flex-col min-h-[350px] lg:min-h-0"
            style={{
              background: 'var(--surface-glass)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h2 className="text-base font-semibold mb-3 shrink-0 text-content-primary">Transcript</h2>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {transcriptsLoading && (
                <p className="text-sm text-content-muted">Loading transcripts...</p>
              )}
              {transcriptsError && (
                <p className="text-sm text-err-500">{transcriptsError}</p>
              )}
              {!transcriptsLoading && !transcriptsError && transcripts.length === 0 && (
                <p className="text-sm text-content-muted">No transcripts used.</p>
              )}
              {transcripts.map((t, i) => (
                <div
                  key={t.id}
                  className="rounded-xl p-3 bg-surface-raised border border-line-subtle"
                >
                  <p className="text-xs mb-1 font-medium text-content-muted">
                    Segment {i + 1} · {new Date(t.metadata?.recordedAt ?? t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-content-secondary">
                    {t.content}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            className="rounded-2xl p-4 flex flex-col min-h-[250px] lg:min-h-0"
            style={{
              background: 'var(--surface-glass)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--border-default)',
            }}
          >
            <h2 className="text-base font-semibold mb-3 shrink-0 text-content-primary">Lecture Material</h2>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {files.length === 0 ? (
                <p className="text-sm text-content-muted">No lecture material uploaded.</p>
              ) : (
                files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl p-3 bg-surface-raised border border-line-subtle"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-content-primary">{f.fileName}</p>
                      <p className="text-xs mt-0.5 text-content-muted">
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
        </div>
      </main>
    </div>
  );

  return context ? content : <SessionProvider vm={vm}>{content}</SessionProvider>;
}
