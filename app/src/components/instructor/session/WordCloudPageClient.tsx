'use client';

// Dedicated interactive word-cloud page for a single discussion.
//
// Layout:
//   ┌─ Header ──────────────────────────────────┐
//   │  Word cloud (top, full-width, words bob)   │
//   │  ─── divider ───                           │
//   │  Response cards (floating grid, fly-in)    │
//   │  Spotlight overlay when a card is selected │
//   └────────────────────────────────────────────┘
//
// Real-time: subscribes to Supabase postgres_changes for new responses.

import * as React from 'react';
import type { Discussion } from '@/types/discussion';
import type { Response } from '@/types/response';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AppLogo } from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

// ─── Constants ────────────────────────────────────────────────────────────────

// Common English words that carry no meaningful signal — excluded from the word cloud
// so the instructor sees content-specific terms rather than grammatical filler.
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'are', 'was', 'were', 'your',
  'you', 'their', 'they', 'them', 'but', 'not', 'can', 'all', 'any', 'too', 'very', 'into',
  'about', 'there', 'what', 'when', 'where', 'which', 'will', 'would', 'should', 'could',
  'has', 'had', 'been', 'being', 'our', 'out', 'how', 'why', 'its', 'it', 'is', 'to', 'of',
  'in', 'on', 'at', 'as', 'an', 'a', 'or', 'by', 'we',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tokenises all response texts into a sorted word-frequency list.
 * Steps:
 *  1. Lowercase and strip punctuation so "drugs," and "drugs" merge.
 *  2. Remove stop words and single/double-character tokens.
 *  3. Return the top 50 words by frequency, highest first.
 *     Font sizing in the render layer is derived from count / maxCount.
 */
function computeWordCloud(responses: Response[]) {
  const counts = new Map<string, number>();
  responses.forEach((r) => {
    const words = r.response_text
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    words.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);
}

/** Wraps occurrences of `word` in the text with a highlighted <mark>. */
function HighlightedText({ text, word }: Readonly<{ text: string; word: string }>) {
  const escaped = word.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  const renderedParts = (() => {
    let matchCount = 0;
    let textCount = 0;
    return parts.map((part) => {
      const isMatch = part.toLowerCase() === word.toLowerCase();
      const key = isMatch ? `match-${matchCount++}` : `text-${textCount++}`;
      if (isMatch) {
        return (
          <mark key={key} style={{ background: 'rgba(45,158,45,0.22)', color: 'var(--color-primary-500)', borderRadius: '3px', padding: '0 2px', fontWeight: 600 }}>
            {part}
          </mark>
        );
      }
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  })();
  return <>{renderedParts}</>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * A single floating response card.
 *
 * Two-wrapper animation strategy:
 *  - Outer div runs the one-shot fly-in (wcCardFlyIn) — enters from below with a slight drift and tilt.
 *  - Inner div runs the infinite bob (wcCardBob) — gentle up/down float after landing.
 * Keeping them separate avoids the two keyframe sequences fighting each other on the same element.
 * Each card gets unique CSS custom properties (drift, tilt, timing) so they all move differently.
 * Bob animation is paused while the card is highlighted (spotlight is open) to reduce visual noise.
 */
function ResponseCard({
  response,
  word,
  index,
  isHighlighted,
  onClick,
}: Readonly<{
  response: Response;
  word: string;
  index: number;
  isHighlighted: boolean;
  onClick: () => void;
}>) {
  // Per-card randomised animation values derived from index so they are stable across re-renders
  const drift = ((index % 2 === 0 ? 1 : -1) * (18 + (index * 13) % 35));
  const tilt  = ((index % 2 === 0 ? 1 : -1) * (1 + (index % 3) * 0.6));
  const bobDur   = 3.2 + (index % 5) * 0.4;
  const bobDelay = (index * 0.35) % 2.5;
  const bobTilt  = 0.3 + (index % 3) * 0.2;
  const flyDelay = index * 75; // stagger each card's entry by 75 ms

  return (
    /* Fly-in wrapper */
    <div
      className="wc-card-fly-in"
      style={{
        '--wc-drift': `${drift}px`,
        '--wc-tilt': `${tilt}deg`,
        '--wc-fly-delay': `${flyDelay}ms`,
      } as React.CSSProperties}
    >
      {/* Bob wrapper */}
      <div
        className={isHighlighted ? '' : 'wc-card-bob'}
        style={{
          '--wc-bob-dur': `${bobDur}s`,
          '--wc-bob-delay': `${bobDelay}s`,
          '--wc-bob-tilt': `${bobTilt}deg`,
        } as React.CSSProperties}
      >
        <button
          type="button"
          data-testid={`response-card-${response.id}`}
          onClick={onClick}
          className="w-full text-left rounded-2xl p-4 transition-all duration-200 focus-visible:outline-none cursor-pointer"
          style={{
            background: isHighlighted ? 'rgba(45,158,45,0.10)' : 'var(--surface-glass)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: isHighlighted
              ? '2px solid var(--color-primary-400)'
              : '1px solid var(--border-default)',
            boxShadow: isHighlighted
              ? '0 0 0 4px rgba(45,158,45,0.12), 0 4px 20px rgba(45,158,45,0.15)'
              : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-content-primary">
            <HighlightedText text={response.response_text} word={word} />
          </p>
          <p className="text-xs mt-2 text-content-muted" suppressHydrationWarning>
            {new Date(response.created_at).toLocaleTimeString()}
          </p>
        </button>
      </div>
    </div>
  );
}

/**
 * Full-screen spotlight overlay for a selected response.
 * Renders over the word cloud page so the instructor can display a single
 * student answer prominently while discussing it with the class.
 * Clicking the backdrop or pressing Escape closes the overlay.
 */
function SpotlightOverlay({
  response,
  word,
  onClose,
}: Readonly<{
  response: Response;
  word: string;
  onClose: () => void;
}>) {
  // Register a global keydown listener so Escape always closes the overlay,
  // even if focus is somewhere else on the page.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    globalThis.window.addEventListener('keydown', handler);
    return () => globalThis.window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <button
      type="button"
      data-testid="spotlight-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        animation: 'wcBackdropIn 0.2s ease-out both',
        border: 'none',
        cursor: 'default',
        padding: 0,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card */}
      <dialog
        data-testid="spotlight-card"
        aria-modal="true"
        open
        className="rounded-2xl p-8 mx-6"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'wcSpotlightIn 0.28s cubic-bezier(0.34, 1.46, 0.64, 1) both',
          background: 'var(--surface-raised)',
          border: '2px solid var(--color-primary-400)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(45,158,45,0.2)',
          width: 'min(640px, calc(100vw - 48px))',
          maxHeight: '80vh',
          overflowY: 'auto',
          margin: 0,
          padding: '2rem',
        }}
      >
        <p
          className="text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words text-content-primary mb-4"
          style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
        >
          <HighlightedText text={response.response_text} word={word} />
        </p>
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs text-content-muted" suppressHydrationWarning>
            {new Date(response.created_at).toLocaleTimeString()}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1 rounded-full font-medium text-content-muted transition-colors"
            style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
          >
            Close (Esc)
          </button>
        </div>
      </dialog>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WordCloudPageClient({
  discussion,
  responses: initialResponses,
}: Readonly<{
  discussion: Discussion;
  responses: Response[];
}>) {
  // responses starts from server-fetched data; real-time inserts are prepended to the front.
  const [responses, setResponses] = React.useState<Response[]>(initialResponses);
  // selectedWord drives which word is active in the cloud and which response panel is shown.
  const [selectedWord, setSelectedWord] = React.useState<string | null>(null);
  // selectedResponseId tracks which card is spotlighted (at most one at a time).
  const [selectedResponseId, setSelectedResponseId] = React.useState<string | null>(null);
  // isLive reflects the Supabase channel subscription status shown as the green dot.
  const [isLive, setIsLive] = React.useState(false);

  // ── Real-time subscription ─────────────────────────────────────────────────
  // Listens for new rows inserted into the responses table filtered to this discussion.
  // Flagged responses are excluded (they are hidden from students too).
  // Deduplication guard (prev.some x.id === r.id) prevents double-adding if the server
  // already included the response in the initial SSR fetch.
  const handleRealtimeInsert = React.useCallback((payload: { new: Response }) => {
    const r = payload.new;
    if (r && !r.flagged_at) {
      setResponses((prev) => prev.some((x) => x.id === r.id) ? prev : [r, ...prev]);
    }
  }, []);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`wc-responses:${discussion.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `discussion_id=eq.${discussion.id}`,
        },
        handleRealtimeInsert
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [discussion.id, handleRealtimeInsert]);

  // Toggle: clicking the same word again collapses the response panel.
  // Always clear selectedResponseId so the spotlight doesn't carry over to the new word's panel.
  const handleWordClick = (word: string) => {
    setSelectedWord((prev) => (prev === word ? null : word));
    setSelectedResponseId(null);
  };

  // Recompute word frequencies whenever the responses list changes (e.g. new real-time insert).
  const wordCloudData = React.useMemo(() => computeWordCloud(responses), [responses]);
  const maxCount = wordCloudData[0]?.count ?? 1;

  // Only include responses that literally contain the selected word (case-insensitive substring).
  const filteredResponses = React.useMemo(() => {
    if (!selectedWord) return [];
    const lw = selectedWord.toLowerCase();
    return responses.filter((r) => r.response_text.toLowerCase().includes(lw));
  }, [selectedWord, responses]);

  // Resolve the full response object for the spotlight overlay from its id.
  const spotlightResponse = React.useMemo(
    () => selectedResponseId ? responses.find((r) => r.id === selectedResponseId) ?? null : null,
    [selectedResponseId, responses]
  );

  return (
    <div
      data-testid="word-cloud-page"
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b shrink-0"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: 'var(--border-default)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size="sm" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
              Word Cloud
            </p>
            <p
              className="text-sm font-semibold leading-snug text-content-primary max-w-xl truncate"
              title={discussion.prompt_text}
            >
              {discussion.prompt_text}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5" title={isLive ? 'Receiving live responses' : 'Connecting…'}>
            <span
              className={isLive ? 'animate-pulse' : ''}
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLive ? 'var(--color-primary-500)' : 'var(--text-muted)',
              }}
            />
            <span className="text-xs text-content-muted hidden sm:inline">
              {responses.length} response{responses.length === 1 ? '' : 's'}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Word Cloud (top) ── */}
      <section className="w-full px-6 pt-10 pb-6 flex flex-col items-center">
        {wordCloudData.length === 0 ? (
          <p className="text-content-muted text-sm py-12">No responses to build a word cloud from yet.</p>
        ) : (
          <div
            data-testid="word-cloud-interactive"
            className="flex flex-wrap gap-x-5 gap-y-3 justify-center items-baseline max-w-5xl"
          >
            {wordCloudData.map((entry, i) => {
              const ratio = entry.count / maxCount;
              const sizePx = 15 + Math.round(ratio * 36);
              const isSelected = selectedWord === entry.word;
              const dimmed = selectedWord !== null && !isSelected;
              const bobDur   = 2.8 + (i % 5) * 0.35;
              const bobDelay = (i * 0.28) % 2.2;
              return (
                <span key={entry.word} className="wc-word-bob" style={{ '--wc-bob-dur': `${bobDur}s`, '--wc-bob-delay': `${bobDelay}s` } as React.CSSProperties}>
                  <button
                    type="button"
                    data-testid={`word-btn-${entry.word}`}
                    title={`${entry.word}: ${entry.count} occurrence${entry.count === 1 ? '' : 's'}`}
                    onClick={() => handleWordClick(entry.word)}
                    className="leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded px-0.5"
                    style={{
                      fontSize: `${sizePx}px`,
                      fontWeight: isSelected ? 800 : 400,
                      color: (isSelected || i % 2 === 0) ? 'var(--color-primary-500)' : 'var(--text-secondary)',
                      opacity: dimmed ? 0.3 : 1,
                      textDecoration: isSelected ? 'underline' : 'none',
                      textUnderlineOffset: '4px',
                      textDecorationColor: 'var(--color-primary-400)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                      transition: 'opacity 0.2s, transform 0.2s, font-weight 0.15s',
                    }}
                  >
                    {entry.word}
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {wordCloudData.length > 0 && !selectedWord && (
          <p className="mt-6 text-xs text-content-muted" style={{ animation: 'wcWordBob 3s ease-in-out infinite' }}>
            Click a word to explore responses
          </p>
        )}
      </section>

      {/* ── Response Cards (below word cloud) ── */}
      {selectedWord && filteredResponses.length > 0 && (
        <section className="wc-section-in px-6 pb-10">
          {/* Section header */}
          <div
            className="flex items-center gap-3 mb-6"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
            }}
          >
            <p className="text-sm font-semibold text-content-primary">
              <span style={{ color: 'var(--color-primary-500)' }}>&ldquo;{selectedWord}&rdquo;</span>
              <span className="ml-2 text-content-muted font-normal">
                — {filteredResponses.length} response{filteredResponses.length === 1 ? '' : 's'}
              </span>
            </p>
            {selectedResponseId && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(45,158,45,0.12)', color: 'var(--color-primary-500)' }}>
                1 shown to class · click backdrop to dismiss
              </span>
            )}
            <button
              type="button"
              aria-label="Close response panel"
              onClick={() => { setSelectedWord(null); setSelectedResponseId(null); }}
              className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {filteredResponses.length === 0 ? (
            <p className="text-sm text-content-muted text-center py-12">No matching responses.</p>
          ) : (
            <div
              data-testid="response-panel"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
                alignItems: 'start',
              }}
            >
              {filteredResponses.map((r, i) => (
                <ResponseCard
                  key={r.id}
                  response={r}
                  word={selectedWord}
                  index={i}
                  isHighlighted={selectedResponseId === r.id}
                  onClick={() => setSelectedResponseId((prev) => prev === r.id ? null : r.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Spotlight overlay ── */}
      {spotlightResponse && selectedWord && (
        <SpotlightOverlay
          response={spotlightResponse}
          word={selectedWord}
          onClose={() => setSelectedResponseId(null)}
        />
      )}
    </div>
  );
}
