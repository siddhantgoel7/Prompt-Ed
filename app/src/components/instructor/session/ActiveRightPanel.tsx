'use client';

// Right panel of the active session view: live student responses, MC answer distribution,
// and a "View Analytics" button that opens a full metrics modal for the active discussion.

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';

// ---------------------------------------------------------------------------
// Analytics Modal
// ---------------------------------------------------------------------------

/** Full metrics modal for a single discussion. Reusable from Analytics tab too. */
export function DiscussionAnalyticsModal({
  open,
  onClose,
  discussion,
  responses,
  studentCount,
}: {
  open: boolean;
  onClose: () => void;
  discussion: Discussion | null;
  responses: Response[];
  studentCount: number;
}) {
  if (!discussion) return null;

  const total = responses.length;
  const snapshot = discussion.participant_snapshot ?? studentCount;
  const responseRate = snapshot > 0 ? Math.round((total / snapshot) * 100) : null;

  // Average response length (chars) for text responses
  const textResponses = responses.filter(
    (r) => discussion.prompt_type !== 'multiple_choice' && r.response_text
  );
  const avgLength =
    textResponses.length > 0
      ? Math.round(
          textResponses.reduce((sum, r) => sum + r.response_text.length, 0) /
            textResponses.length
        )
      : null;

  // Time from published_at to first response
  const firstResponseTime = (() => {
    if (!discussion.published_at || responses.length === 0) return null;
    const sorted = [...responses].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const diffMs =
      new Date(sorted[0].created_at).getTime() -
      new Date(discussion.published_at).getTime();
    const secs = Math.round(diffMs / 1000);
    return secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
  })();

  // MC distribution
  const isMC = discussion.prompt_type === 'multiple_choice';
  const distribution: Record<string, number> = {};
  if (isMC && discussion.mc_options) {
    discussion.mc_options.forEach((opt) => { distribution[opt.label] = 0; });
    responses.forEach((r) => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }

  // Timestamp buckets — group responses into 1-minute windows
  const timeBuckets = (() => {
    if (responses.length === 0 || !discussion.published_at) return [];
    const base = new Date(discussion.published_at).getTime();
    const buckets: Record<number, number> = {};
    responses.forEach((r) => {
      const bucket = Math.floor(
        (new Date(r.created_at).getTime() - base) / 60000
      );
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    });
    const maxBucket = Math.max(...Object.keys(buckets).map(Number));
    return Array.from({ length: maxBucket + 1 }, (_, i) => ({
      label: `+${i}m`,
      count: buckets[i] ?? 0,
    }));
  })();

  const maxBucketCount = Math.max(...timeBuckets.map((b) => b.count), 1);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug pr-6">
            Analytics — {discussion.prompt_text}
          </DialogTitle>
        </DialogHeader>

        {/* ── Headline stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <StatCard label="Responses" value={String(total)} />
          <StatCard
            label="Response Rate"
            value={responseRate !== null ? `${responseRate}%` : '—'}
            sub={snapshot > 0 ? `${total} / ${snapshot} students` : undefined}
          />
          {avgLength !== null && (
            <StatCard label="Avg Length" value={`${avgLength} chars`} />
          )}
          {firstResponseTime && (
            <StatCard label="First Response" value={firstResponseTime} sub="after publish" />
          )}
        </div>

        {/* ── MC distribution ── */}
        {isMC && discussion.mc_options && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Answer Distribution
            </p>
            <div className="space-y-2">
              {discussion.mc_options.map((opt) => {
                const count = distribution[opt.label] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const isCorrect = discussion.correct_option === opt.label;
                return (
                  <div key={opt.label} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className={isCorrect ? 'font-semibold text-green-700' : ''}>
                        {opt.label}. {opt.text}
                        {isCorrect && <span className="ml-1 text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">Correct</span>}
                      </span>
                      <span className="text-gray-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-blue-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Timestamp distribution ── */}
        {timeBuckets.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Response Timeline (per minute)
            </p>
            <div className="flex items-end gap-1 h-16">
              {timeBuckets.map((b) => (
                <div key={b.label} className="flex flex-col items-center flex-1 gap-0.5">
                  <div
                    className="w-full bg-blue-400 rounded-sm"
                    style={{ height: `${Math.round((b.count / maxBucketCount) * 48)}px` }}
                  />
                  <span className="text-[9px] text-gray-400">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All responses ── */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            All Responses ({total})
          </p>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">No responses yet.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {responses.map((r) => (
                <Card key={r.id} className="border-gray-100">
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap break-words">{r.response_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.created_at).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Small stat display card used inside the analytics modal. */
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActiveRightPanel
// ---------------------------------------------------------------------------

/** Displays live student responses and, for MC questions, per-option response counts.
 *  Also shows a "View Analytics" button that opens the DiscussionAnalyticsModal. */
export function ActiveRightPanel(props: {
  responses?: Response[];
  activeDiscussion?: Discussion | null;
  studentCount?: number;
}) {
  const context = React.useContext(SessionContext);
  const responses = context ? context.responses : props.responses!;
  const activeDiscussion = context ? context.activeDiscussion : props.activeDiscussion!;
  const studentCount = context ? context.studentCount : (props.studentCount ?? 0);

  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);

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

  return (
    <aside className="w-80 max-md:w-full border-l border-gray-300 p-4 md:p-6 flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Live Responses</div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">{responses.length}</div>
          {studentCount > 0 && (
            <div className="text-xs text-gray-400">/ {studentCount} students</div>
          )}
          {activeDiscussion && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setAnalyticsOpen(true)}
            >
              View Analytics
            </Button>
          )}
        </div>
      </div>

      {isMC && activeDiscussion?.mc_options && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-semibold mb-2 text-gray-800">Options:</div>
          <div className="space-y-2 mb-4">
            {activeDiscussion.mc_options.map((opt) => (
              <div key={opt.label} className="text-xs">
                <span className="font-semibold mr-1">{opt.label}.</span>
                <span className={activeDiscussion.correct_option === opt.label ? 'font-bold text-green-700' : ''}>
                  {opt.text}
                </span>
                {activeDiscussion.correct_option === opt.label && (
                  <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Correct</span>
                )}
              </div>
            ))}
          </div>

          <div className="text-xs space-y-1 pt-3 border-t border-gray-200">
            <div className="font-semibold text-gray-700 mb-2">Student Responses</div>
            {Object.entries(distribution).map(([label, count]) => (
              <div key={label} className="flex justify-between items-center">
                <span>Option {label}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Waiting for student responses...
          </p>
        ) : (
          <div className="space-y-2 pr-2">
            {responses.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {r.response_text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Analytics modal */}
      <DiscussionAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        discussion={activeDiscussion ?? null}
        responses={responses}
        studentCount={studentCount}
      />
    </aside>
  );
}
