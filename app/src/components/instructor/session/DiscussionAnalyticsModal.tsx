'use client';

// Reusable analytics modal for a single discussion.
// Used by ActiveRightPanel (live view), ActiveSidebar analytics tab, and SessionEndedView.

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';

/** Full metrics modal for a single discussion. */
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
  const isActive = discussion.status === 'active';
  const snapshot = isActive
    ? Math.max(discussion.participant_snapshot ?? 0, studentCount)
    : (discussion.participant_snapshot ?? studentCount);
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
export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}