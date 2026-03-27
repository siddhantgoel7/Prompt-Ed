'use client';

// Reusable analytics content and modal for a single discussion.
// Used by ActiveRightPanel (live view inline) and SessionEndedView (modal).

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const CORRECT_COLOR = '#22c55e';

export function DiscussionAnalyticsContent({
  discussion,
  responses,
  studentCount,
}: Readonly<{
  discussion: Discussion;
  responses: Response[];
  studentCount: number;
}>) {
  const total = responses.length;
  const isActive = discussion.status === 'active';
  const snapshot = isActive
    ? Math.max(discussion.participant_snapshot ?? 0, studentCount)
    : (discussion.participant_snapshot ?? studentCount);
  const responseRate = snapshot > 0 ? Math.round((total / snapshot) * 100) : null;

  // MC distribution
  const isMC = discussion.prompt_type === 'multiple_choice';
  const mcChartData = (() => {
    if (!isMC || !discussion.mc_options) return [];
    const dist: Record<string, number> = {};
    discussion.mc_options.forEach((opt) => { dist[opt.label] = 0; });
    responses.forEach((r) => {
      if (r.selected_option && dist[r.selected_option] !== undefined) {
        dist[r.selected_option]++;
      }
    });
    const totalVotes = Object.values(dist).reduce((sum, count) => sum + count, 0);
    return discussion.mc_options.map((opt, i) => ({
      label: opt.label,
      text: opt.text,
      count: dist[opt.label] ?? 0,
      percentage: totalVotes > 0 ? Math.round(((dist[opt.label] ?? 0) / totalVotes) * 100) : 0,
      isCorrect: discussion.correct_option === opt.label,
      // Pass fill directly to avoid using deprecated Cell component in some recharts versions
      fill: discussion.correct_option === opt.label ? CORRECT_COLOR : PIE_COLORS[i % PIE_COLORS.length]
    }));
  })();

  // Timestamp buckets — group responses into 1-minute windows
  const timelineData = (() => {
    if (responses.length === 0 || !discussion.published_at) return [];
    const base = new Date(discussion.published_at).getTime();
    const buckets: Record<number, number> = {};
    responses.forEach((r) => {
      const bucket = Math.floor((new Date(r.created_at).getTime() - base) / 60000);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    });
    const maxBucket = Math.max(...Object.keys(buckets).map(Number));
    return Array.from({ length: maxBucket + 1 }, (_, i) => ({
      name: `+${i}m`,
      Responses: buckets[i] ?? 0,
    }));
  })();

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* ── Headline stats ── */}
      <div className="grid grid-cols-2 gap-3 mt-2 pr-1">
        <StatCard label="Responses" value={String(total)} />
        <StatCard
          label="Response Rate"
          value={responseRate === null ? '—' : `${responseRate}%`}
          sub={snapshot > 0 ? `${total} / ${snapshot} students` : undefined}
          infoText="Responses received divided by the number of students who joined during this discussion."
        />
      </div>

      {/* ── MC donut chart ── */}
      {isMC && mcChartData.length > 0 && (() => {
        const totalVotes = mcChartData.reduce((s, e) => s + e.count, 0);
        return (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-content-muted">
              Answer Distribution
            </p>
            <div className="flex flex-row gap-4 items-center">
              {/* Donut with center overlay */}
              <div className="relative w-1/2 shrink-0">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={mcChartData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={68}
                      startAngle={90}
                      endAngle={-270}
                      minAngle={1}
                      paddingAngle={0}
                      label={false}
                      labelLine={false}
                      stroke="none"
                    >
                      {mcChartData.map((entry) => (
                        <Cell key={entry.label} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} votes`, `Option ${name}`]} // eslint-disable-line @typescript-eslint/no-explicit-any
                      contentStyle={{
                        background: 'var(--surface-overlay)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-content-primary leading-none">{totalVotes}</span>
                  <span className="text-[10px] text-content-muted mt-0.5">votes</span>
                </div>
              </div>

              {/* Compact legend */}
              <div className="w-1/2 space-y-2">
                {mcChartData.map((entry) => (
                  <div key={entry.label} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: entry.fill }}
                    />
                    <span className="text-xs font-bold shrink-0 w-4" style={{ color: entry.fill }}>
                      {entry.label}
                    </span>
                    <span className="text-xs text-content-primary flex-1">
                      {entry.count} ({entry.percentage}%)
                    </span>
                    {entry.isCorrect && (
                      <span
                        className="text-[10px] px-1 py-0.5 rounded font-semibold shrink-0"
                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Response timeline bar chart ── */}
      {timelineData.length > 0 && (
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3 text-content-muted"
          >
            Response Timeline (per minute)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-overlay)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
                formatter={(v: any) => [`${v} responses`, 'Count']} // eslint-disable-line @typescript-eslint/no-explicit-any
              />
              <Bar dataKey="Responses" fill="var(--color-primary-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── All responses ── */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2 text-content-muted"
        >
          All Responses ({total})
        </p>
        {total === 0 ? (
          <p className="text-sm text-content-muted">No responses yet.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {responses.map((r) => (
              <div
                key={r.id}
                className="rounded-xl p-3 bg-surface-raised border border-line-subtle"
              >
                <p className="text-sm whitespace-pre-wrap break-words text-content-primary">
                  {r.response_text}
                </p>
                <p className="text-xs mt-1 text-content-muted" suppressHydrationWarning>
                  {new Date(r.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Full metrics modal for a single discussion. */
export function DiscussionAnalyticsModal({
  open,
  onClose,
  discussion,
  responses,
  studentCount,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  discussion: Discussion | null;
  responses: Response[];
  studentCount: number;
}>) {
  if (!discussion) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug pr-6">
            Analytics — {discussion.prompt_text}
          </DialogTitle>
        </DialogHeader>

        <DiscussionAnalyticsContent
          discussion={discussion}
          responses={responses}
          studentCount={studentCount}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Small stat display card used inside the analytics modal. */
export function StatCard({ label, value, sub, infoText }: Readonly<{ label: string; value: string; sub?: string; infoText?: string }>) {
  return (
    <div
      className="rounded-xl p-3 bg-surface-raised border border-line-subtle"
    >
      <p className="text-xs mb-1 text-content-muted flex items-center gap-1">
        {label}
        {infoText && (
          <UITooltip>
            <UITooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground inline-block" aria-label="What is response rate?" tabIndex={0} />
            </UITooltipTrigger>
            <UITooltipContent>{infoText}</UITooltipContent>
          </UITooltip>
        )}
      </p>
      <p className="text-xl font-bold text-content-primary">{value}</p>
      {sub && <p className="text-[10px] mt-0.5 text-content-muted">{sub}</p>}
    </div>
  );
}
