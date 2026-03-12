'use client';

// Reusable analytics content and modal for a single discussion.
// Used by ActiveRightPanel (live view inline) and SessionEndedView (modal).

import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const CORRECT_COLOR = '#22c55e';

export function DiscussionAnalyticsContent({
  discussion,
  responses,
  studentCount,
}: {
  discussion: Discussion;
  responses: Response[];
  studentCount: number;
}) {
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
    return discussion.mc_options.map((opt) => ({
      label: opt.label,
      text: opt.text,
      count: dist[opt.label] ?? 0,
      isCorrect: discussion.correct_option === opt.label,
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
          value={responseRate !== null ? `${responseRate}%` : '—'}
          sub={snapshot > 0 ? `${total} / ${snapshot} students` : undefined}
        />
      </div>

      {/* ── MC pie chart ── */}
      {isMC && mcChartData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Answer Distribution
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={mcChartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) =>
                    `${name} (${Math.round((percent ?? 0) * 100)}%)`
                  }
                  labelLine={false}
                >
                  {mcChartData.map((entry, i) => (
                    <Cell
                      key={entry.label}
                      fill={entry.isCorrect ? CORRECT_COLOR : PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} votes`, `Option ${name}`]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend table */}
            <div className="w-full sm:w-48 shrink-0 space-y-1.5">
              {mcChartData.map((entry, i) => (
                <div key={entry.label} className="flex items-start gap-2 text-xs">
                  <span
                    className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: entry.isCorrect ? CORRECT_COLOR : PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className={entry.isCorrect ? 'font-semibold text-green-700' : 'text-gray-700'}>
                    {entry.label}. {entry.text}
                    {entry.isCorrect && (
                      <span className="ml-1 text-[10px] bg-green-100 text-green-800 px-1 py-0.5 rounded">Correct</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Response timeline bar chart ── */}
      {timelineData.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
            Response Timeline (per minute)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v) => [`${v} responses`, 'Count']}
              />
              <Bar dataKey="Responses" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── All responses ── */}
      <div>
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
}: {
  open: boolean;
  onClose: () => void;
  discussion: Discussion | null;
  responses: Response[];
  studentCount: number;
}) {
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
export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
