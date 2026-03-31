'use client';

// Reusable analytics content and modal for a single discussion.
// Used by ActiveRightPanel (live view inline) and SessionEndedView (modal).

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger } from '@/components/ui/tooltip';
import { Info, ExternalLink, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
const DONUT_HEIGHT = 150;
const DONUT_INNER_RADIUS = 52;
const DONUT_OUTER_RADIUS = 68;
const MS_PER_MINUTE = 60_000;
const MAX_WORD_CLOUD_WORDS = 30;

const CHART_TOOLTIP_STYLE = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-default)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '12px',
  boxShadow: '0 4px 16px var(--color-black-alpha-10)',
} as const;

const CHART_TOOLTIP_WRAPPER = { zIndex: 50 } as const;
const CHART_TOOLTIP_TEXT_STYLE = { color: 'var(--text-primary)' } as const;

const fmtCount = (n: number) => `Count: ${n} ${n === 1 ? 'response' : 'responses'}`;

const WORD_CLOUD_STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'are', 'was', 'were', 'your',
  'you', 'their', 'they', 'them', 'but', 'not', 'can', 'all', 'any', 'too', 'very', 'into',
  'about', 'there', 'what', 'when', 'where', 'which', 'will', 'would', 'should', 'could',
  'has', 'had', 'been', 'being', 'our', 'out', 'how', 'why', 'its', 'it', 'is', 'to', 'of',
  'in', 'on', 'at', 'as', 'an', 'a', 'or', 'by', 'we',
]);

type DonutEntry = { label: string; fill: string; count: number };

function DonutChart({
  data,
  centerLabel,
  centerSub,
  tooltipFormatter,
}: Readonly<{
  data: DonutEntry[];
  centerLabel: string;
  centerSub: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tooltipFormatter: (value: any, name: any) => [string, string];
}>) {
  return (
    <div className="relative w-1/2 shrink-0 select-none [&_*]:select-none outline-none">
      <ResponsiveContainer width="100%" height={DONUT_HEIGHT}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={DONUT_INNER_RADIUS}
            outerRadius={DONUT_OUTER_RADIUS}
            startAngle={90}
            endAngle={-270}
            minAngle={1}
            paddingAngle={0}
            label={false}
            labelLine={false}
            stroke="none"
          >
          </Pie>
          <Tooltip
            formatter={tooltipFormatter}
            wrapperStyle={CHART_TOOLTIP_WRAPPER}
            contentStyle={CHART_TOOLTIP_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 1 }}>
        <span className="text-xl font-bold text-content-primary leading-none">{centerLabel}</span>
        <span className="text-[10px] text-content-muted mt-0.5">{centerSub}</span>
      </div>
    </div>
  );
}

/** Shared donut-or-bar chart section with toggle header and right-side legend. */
function DistributionSection({
  title,
  chartType,
  onSetChartType,
  data,
  centerLabel,
  centerSub,
  children,
}: Readonly<{
  title: string;
  chartType: 'donut' | 'bar';
  onSetChartType: (type: 'donut' | 'bar') => void;
  data: Array<{ label: string; count: number; fill: string }>;
  centerLabel: string;
  centerSub: string;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">{title}</p>
        <div className="flex items-center gap-1">
          {([['donut', PieChartIcon], ['bar', BarChart2]] as const).map(([type, Icon]) => (
            <button
              key={type}
              type="button"
              onClick={() => onSetChartType(type)}
              aria-label={`${type} chart`}
              className="p-1 rounded transition-colors"
              style={chartType === type ? {
                background: 'var(--surface-overlay)',
                color: 'var(--text-primary)',
              } : {
                color: 'var(--text-muted)',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-row gap-4 items-center">
        {chartType === 'donut' ? (
          <DonutChart
            data={data}
            centerLabel={centerLabel}
            centerSub={centerSub}
            tooltipFormatter={(value, name) => [fmtCount(value), name]}
          />
        ) : (
          <div className="w-1/2 shrink-0">
            <ResponsiveContainer width="100%" height={DONUT_HEIGHT}>
              <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER}
                  labelStyle={CHART_TOOLTIP_TEXT_STYLE}
                  itemStyle={CHART_TOOLTIP_TEXT_STYLE}
                  separator=""
                  formatter={(value) => [fmtCount(Number(value ?? 0)), '']}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="w-1/2 space-y-2">{children}</div>
      </div>
    </div>
  );
}

export function DiscussionAnalyticsContent({
  discussion,
  responses,
  studentCount,
  lessonId,
}: Readonly<{
  discussion: Discussion;
  responses: Response[];
  studentCount: number;
  lessonId?: string;
}>) {
  const total = responses.length;
  const isActive = discussion.status === 'active';
  const isMC = discussion.prompt_type === 'multiple_choice';
  // isFreeText covers both short_answer and long_answer — both produce word clouds
  // since they are open-text responses (as opposed to multiple_choice selections).
  const isFreeText = discussion.prompt_type === 'short_answer' || discussion.prompt_type === 'long_answer';

  const snapshot = isActive
    ? Math.max(discussion.participant_snapshot ?? 0, studentCount)
    : (discussion.participant_snapshot ?? studentCount);
  const responseRate = snapshot > 0 ? Math.round((total / snapshot) * 100) : null;

  const mcChartData = useMemo(() => {
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
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [isMC, discussion.mc_options, discussion.correct_option, responses]);

  const ciStats = useMemo(() => {
    if (!isMC || !discussion.correct_option) return null;
    const answered = responses.filter(r => r.is_correct !== null);
    if (answered.length === 0) return null;
    const correctCount = answered.filter(r => r.is_correct === true).length;
    const incorrectCount = answered.filter(r => r.is_correct === false).length;
    return {
      answered,
      pct: Math.round((correctCount / answered.length) * 100),
      data: [
        { label: 'Correct', count: correctCount, fill: '#22c55e' },
        { label: 'Incorrect', count: incorrectCount, fill: '#ef4444' },
      ],
    };
  }, [isMC, discussion.correct_option, responses]);

  const wordCloudData = useMemo(() => {
    if (!isFreeText) return [];
    const counts = new Map<string, number>();
    responses.forEach((r) => {
      r.response_text
        .toLowerCase()
        .replaceAll(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !WORD_CLOUD_STOP_WORDS.has(w))
        .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
    });
    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_WORD_CLOUD_WORDS);
  }, [isFreeText, responses]);

  const maxWordCount = wordCloudData[0]?.count ?? 1;

  const timelineData = useMemo(() => {
    if (responses.length === 0 || !discussion.published_at) return [];
    const base = new Date(discussion.published_at).getTime();
    const buckets: Record<number, number> = {};
    responses.forEach((r) => {
      const bucket = Math.floor((new Date(r.created_at).getTime() - base) / MS_PER_MINUTE);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    });
    const maxBucket = Math.max(...Object.keys(buckets).map(Number));
    return Array.from({ length: maxBucket + 1 }, (_, i) => ({
      name: `+${i}m`,
      Responses: buckets[i] ?? 0,
    }));
  }, [responses, discussion.published_at]);

  /**
   * Opens the word cloud in a new browser tab.
   * Primary path: navigate to the dedicated interactive word cloud page
   *   (/session/[lessonId]/word-cloud/[discussionId]) when lessonId is available.
   * Fallback path: write a minimal static HTML popup when lessonId is not provided.
   */
  const openWordCloudInNewTab = () => {
    if (wordCloudData.length === 0) return;
    if (lessonId) {
      window.open(`/session/${lessonId}/word-cloud/${discussion.id}`, '_blank');
      return;
    }
    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const popup = window.open('', '_blank');
    if (!popup) return;
    const wordsMarkup = wordCloudData
      .map((entry, i) => {
        const ratio = entry.count / maxWordCount;
        const sizePx = 12 + Math.round(ratio * 16);
        const color = i % 2 === 0 ? '#2d9e2d' : '#374151';
        const title = escapeHtml(`${entry.word}: ${entry.count}`);
        return `<span title="${title}" style="font-size:${sizePx}px;color:${color};line-height:1;">${escapeHtml(entry.word)}</span>`;
      })
      .join('');
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Word Cloud</title>
    <style>
      body { margin: 0; padding: 24px; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background: #f9fafb; color: #111827; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      p { margin: 0 0 20px; color: #6b7280; }
      .cloud { border: 1px solid #e5e7eb; background: #ffffff; border-radius: 12px; padding: 16px; display: flex; flex-wrap: wrap; gap: 10px 14px; }
    </style>
  </head>
  <body>
    <h1>Word Cloud</h1>
    <p>${escapeHtml(discussion.prompt_text)}</p>
    <div class="cloud">${wordsMarkup}</div>
  </body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    popup.location.href = url;
    popup.focus();
  };

  const totalMcVotes = mcChartData.reduce((s, e) => s + e.count, 0);
  const [mcChartType, setMcChartType] = useState<'donut' | 'bar'>('donut');
  const [ciChartType, setCiChartType] = useState<'donut' | 'bar'>('donut');

  return (
    <div className="flex flex-col gap-5 pb-4 min-w-0 w-full overflow-hidden">
      {/* ── Headline stats ── */}
      <div className="grid grid-cols-2 gap-3 mt-2 pr-1 min-w-0 w-full">
        <StatCard label="Responses" value={String(total)} />
        <StatCard
          label="Response Rate"
          value={responseRate === null ? '—' : `${responseRate}%`}
          sub={snapshot > 0 ? `${total} / ${snapshot} students` : undefined}
          infoText="Responses received divided by the number of students who joined during this discussion."
        />
      </div>

      {/* ── Correct vs Incorrect chart ── */}
      {ciStats && (
        <DistributionSection
          title="Correct vs Incorrect"
          chartType={ciChartType}
          onSetChartType={setCiChartType}
          data={ciStats.data}
          centerLabel={`${ciStats.pct}%`}
          centerSub="correct"
        >
          {ciStats.data.map((entry) => (
            <div key={entry.label} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.fill }} />
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                style={{
                  background: entry.label === 'Correct' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: entry.fill,
                }}
              >
                {entry.label}
              </span>
              <span className="text-xs text-content-primary flex-1">
                {entry.count} ({ciStats.answered.length > 0 ? Math.round((entry.count / ciStats.answered.length) * 100) : 0}%)
              </span>
            </div>
          ))}
        </DistributionSection>
      )}

      {/* ── MC answer distribution ── */}
      {isMC && mcChartData.length > 0 && (
        <DistributionSection
          title="Answer Distribution"
          chartType={mcChartType}
          onSetChartType={setMcChartType}
          data={mcChartData}
          centerLabel={String(totalMcVotes)}
          centerSub="responses"
        >
          {mcChartData.map((entry) => (
            <div key={entry.label} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.fill }} />
              <span className="text-xs font-bold shrink-0 w-4" style={{ color: entry.fill }}>
                {entry.label}
              </span>
              <span className="text-xs text-content-primary flex-1">
                {entry.count} ({entry.percentage}%)
                {entry.isCorrect && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold ml-1.5"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                  >
                    correct
                  </span>
                )}
              </span>
            </div>
          ))}
        </DistributionSection>
      )}

      {isFreeText && wordCloudData.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Common Word Cloud
            </p>
            <button
              type="button"
              aria-label="Open word cloud in new tab"
              onClick={openWordCloudInNewTab}
              className="inline-flex items-center gap-1 text-xs font-medium text-content-muted hover:text-content-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            data-testid="word-cloud"
            className="rounded-xl p-3 bg-surface-raised border border-line-subtle flex flex-wrap gap-x-3 gap-y-2"
          >
            {wordCloudData.map((entry, i) => {
              const ratio = entry.count / maxWordCount;
              const sizePx = 12 + Math.round(ratio * 16);
              return (
                <span
                  key={entry.word}
                  title={`${entry.word}: ${entry.count}`}
                  className="leading-none break-all max-w-full"
                  style={{
                    fontSize: `${sizePx}px`,
                    color: i % 2 === 0 ? 'var(--color-primary-500)' : 'var(--text-secondary)',
                  }}
                >
                  {entry.word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Response timeline bar chart ── */}
      {timelineData.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-content-muted">
            Response Timeline (per minute)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_TEXT_STYLE}
                itemStyle={CHART_TOOLTIP_TEXT_STYLE}
                separator=""
                formatter={(v) => [fmtCount(Number(v ?? 0)), '']}
              />
              <Bar dataKey="Responses" fill="var(--color-primary-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── All responses ── */}
      <div className="min-w-0 w-full">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-content-muted">
          All Responses ({total})
        </p>
        {total === 0 ? (
          <p className="text-sm text-content-muted">No responses yet.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 min-w-0 w-full">
            {responses.map((r) => (
              <div
                key={r.id}
                className="rounded-xl p-3 bg-surface-raised border border-line-subtle max-w-full w-full min-w-0 overflow-hidden"
              >
                <p className="text-sm whitespace-pre-wrap break-all break-words text-content-primary">
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
  lessonId,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  discussion: Discussion | null;
  responses: Response[];
  studentCount: number;
  lessonId?: string;
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
          lessonId={lessonId}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Small stat display card used inside the analytics modal. */
export function StatCard({ label, value, sub, infoText }: Readonly<{ label: string; value: string; sub?: string; infoText?: string }>) {
  return (
    <div className="rounded-xl p-3 bg-surface-raised border border-line-subtle">
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
