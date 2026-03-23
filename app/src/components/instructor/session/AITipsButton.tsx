// Self-contained AI best-practices button.
//
// Sections (in order):
//   SpotlightOverlay  — SVG portal that dims the rest of the UI with an
//                       even-odd "hole" cut out over the target button so
//                       clicks fall through without z-index fights.
//   TipsModal         — Full-screen modal with numbered best-practice tips.
//   AITipsButton      — The (i) icon button. Uses sessionStorage keyed by
//                       lessonId so the spotlight shows once per browser
//                       session when the lesson is opened, and never again
//                       until the tab is closed and reopened.
'use client';

import * as React from 'react';
import ReactDOM from 'react-dom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds an SVG path string for a rounded rectangle (clockwise). */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const cr = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + cr} ${y}`,
    `H ${x + w - cr}`,
    `Q ${x + w} ${y} ${x + w} ${y + cr}`,
    `V ${y + h - cr}`,
    `Q ${x + w} ${y + h} ${x + w - cr} ${y + h}`,
    `H ${x + cr}`,
    `Q ${x} ${y + h} ${x} ${y + h - cr}`,
    `V ${y + cr}`,
    `Q ${x} ${y} ${x + cr} ${y}`,
    'Z',
  ].join(' ');
}

// ---------------------------------------------------------------------------
// SpotlightOverlay
// ---------------------------------------------------------------------------

/**
 * Renders a full-viewport SVG via React portal.
 *
 * The SVG uses fill-rule="evenodd": a large outer rect filled with the
 * semi-transparent dark colour, minus a rounded-rect "hole" over the target
 * element. Because the hole area has no fill, pointer events fall through to
 * whatever is beneath — the button stays fully clickable without needing to
 * escape a stacking context via z-index.
 *
 * Clicking anywhere in the filled area calls onDismiss.
 */
function SpotlightOverlay({
  targetRect,
  padding = 10,
  onDismiss,
}: {
  targetRect: DOMRect;
  padding?: number;
  onDismiss: () => void;
}) {
  const [vw, setVw] = React.useState(() => window.innerWidth);
  const [vh, setVh] = React.useState(() => window.innerHeight);

  React.useEffect(() => {
    const onResize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const outerRect = `M 0 0 H ${vw} V ${vh} H 0 Z`;
  const hole = roundedRectPath(
    targetRect.left - padding,
    targetRect.top - padding,
    targetRect.width + padding * 2,
    targetRect.height + padding * 2,
    14,
  );
  // Even-odd rule: outer rect filled, inner rounded rect = transparent hole.
  const d = `${outerRect} ${hole}`;

  // Tooltip anchor — centred below the hole.
  const tooltipX = targetRect.left + targetRect.width / 2;
  const tooltipY = targetRect.bottom + padding + 16;

  return ReactDOM.createPortal(
    <svg
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        width: '100vw',
        height: '100vh',
        overflow: 'visible',
      }}
      xmlns="http://www.w3.org/2000/svg"
      onClick={onDismiss}
      aria-hidden="true"
    >
      {/* Dimming layer with hole */}
      <path
        d={d}
        fillRule="evenodd"
        fill="rgba(0,0,0,0.65)"
        style={{ cursor: 'default' }}
      />

      {/* Glowing ring around the hole */}
      <rect
        x={targetRect.left - padding}
        y={targetRect.top - padding}
        width={targetRect.width + padding * 2}
        height={targetRect.height + padding * 2}
        rx={14}
        fill="none"
        stroke="var(--color-primary-400)"
        strokeWidth={2}
        style={{
          filter: 'drop-shadow(0 0 8px var(--color-primary-400))',
          animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        }}
      />

      {/* Tooltip */}
      <foreignObject
        x={tooltipX - 110}
        y={tooltipY}
        width={220}
        height={60}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            padding: '8px 12px',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <p
            style={{
              color: 'var(--color-primary-500)',
              fontSize: '0.75rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Click for AI best practices
          </p>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.6875rem',
              margin: '2px 0 0',
            }}
          >
            Click anywhere else to dismiss
          </p>
        </div>
      </foreignObject>
    </svg>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// TipsModal
// ---------------------------------------------------------------------------

function TipsModal({ onClose }: { onClose: () => void }) {
  // Close on Escape key.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 110, background: 'var(--color-black-alpha-30)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
      role="button"
      tabIndex={-1}
      aria-label="Close modal backdrop"
    >
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 enter"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 8px 40px var(--color-black-alpha-30)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-tips-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-brand-500">
              Best Practices
            </p>
            <h2 id="ai-tips-title" className="text-base font-semibold text-content-primary">
              Getting the Best AI-Generated Questions
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary transition-colors"
            style={{ background: 'var(--surface-overlay)' }}
            aria-label="Close tips"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tips list */}
        <div className="space-y-5 text-sm text-content-secondary">
          <Tip index={1} title="Upload Specific Lesson Files First">
            The <strong className="text-content-primary">Files tab</strong> in every session lets you upload material for the AI to draw from. Upload lecture slides, handouts, or case studies for that specific class, not the entire course. The narrower the source, the more precise the questions.
          </Tip>

          <Tip index={2} title="Match Question Type to Your Goal">
            <ul className="space-y-1.5 mt-1">
              <TipBullet label="Multiple choice">Factual recall, classification, spotting misconceptions. Students see instant correctness feedback and you get option-by-option analytics.</TipBullet>
              <TipBullet label="Short answer">Quick reasoning, one-line justifications. Best for mid-lecture check-ins.</TipBullet>
              <TipBullet label="Long answer">Multi-step reasoning or synthesis. Best saved for the end of a lesson.</TipBullet>
            </ul>
          </Tip>

          <Tip index={3} title="Do a Test Run Beforehand">
            Generate 2–3 questions in a test lesson first. Check that MC distractors are plausible and that the language matches your course level. Prior sessions persist, so they serve as a calibration reference.
          </Tip>

          <Tip index={4} title="Review and Edit Before Publishing">
            The AI gives you three candidate questions — pick one, edit it, or write your own via the <strong className="text-content-primary">Manual entry</strong> field. Always read the question before publishing: reject anything too vague, too long, or already covered.
          </Tip>

          <Tip index={5} title="Use Analytics to Guide the Next Question">
            After closing a discussion, the analytics panel shows response distribution. MC option clusters reveal shared misconceptions, make those your next prompt. Open-answer responses show you the language students are actually using.
          </Tip>

          <Tip index={6} title="One Active Discussion at a Time">
            The split-view is for <em>monitoring</em> two discussions side by side, not for running them simultaneously. Close one before activating the next.
          </Tip>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Tip({ index, title, children }: { index: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 text-white"
        style={{ background: 'var(--color-primary-500)' }}
      >
        {index}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-content-primary mb-1">{title}</p>
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function TipBullet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-1.5 items-baseline list-none">
      <span className="font-semibold text-brand-500 flex-shrink-0">{label} —</span>
      <span>{children}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// AITipsButton
// ---------------------------------------------------------------------------

/**
 * Styled like the ThemeToggle icon button (w-9 h-9 rounded-[10px]).
 *
 * Spotlight behaviour — once per browser session per lesson:
 *   • Uses sessionStorage keyed by lessonId.
 *   • The spotlight shows the first time the instructor opens a given lesson
 *     in a browser tab.  When they click the button (opening the tips) or
 *     click anywhere outside (dismissing), the key is written and the overlay
 *     never shows again for that tab.
 *   • Closing the tab / opening a new one resets sessionStorage, so the
 *     spotlight reappears the next time the session is visited — matching the
 *     "once per session when created" intent.
 */
export function AITipsButton({ lessonId }: { lessonId: string }) {
  const STORAGE_KEY = `ai-tips-seen-${lessonId}`;

  const [hasSeenTips, setHasSeenTips] = React.useState<boolean>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const [showModal, setShowModal] = React.useState(false);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  // Capture the button's position once after first paint.
  React.useLayoutEffect(() => {
    if (!hasSeenTips && btnRef.current) {
      setTargetRect(btnRef.current.getBoundingClientRect());
    }
  }, [hasSeenTips]);

  // Keep the rect fresh on scroll / resize while the spotlight is visible.
  React.useEffect(() => {
    if (hasSeenTips || !btnRef.current) return;

    const update = () => {
      if (btnRef.current) setTargetRect(btnRef.current.getBoundingClientRect());
    };

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [hasSeenTips]);

  const markSeen = React.useCallback(() => {
    setHasSeenTips(true);
    try { sessionStorage.setItem(STORAGE_KEY, 'true'); } catch { /* ignore */ }
  }, [STORAGE_KEY]);

  const handleButtonClick = React.useCallback(() => {
    markSeen();
    setShowModal(true);
  }, [markSeen]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleButtonClick}
        aria-label="AI generation best practices"
        className="w-9 h-9 flex items-center justify-center rounded-[10px] border border-border bg-surface-raised text-muted-foreground hover:text-foreground btn-icon-hover transition-all duration-150"
      >
        {/* Info circle icon — matches the 16×16 size of ThemeToggle icons */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none"/>
        </svg>
      </button>

      {/* Spotlight overlay — only shown until dismissed for this session. */}
      {!hasSeenTips && targetRect && (
        <SpotlightOverlay targetRect={targetRect} onDismiss={markSeen} />
      )}

      {/* Tips modal */}
      {showModal && <TipsModal onClose={() => setShowModal(false)} />}
    </>
  );
}
