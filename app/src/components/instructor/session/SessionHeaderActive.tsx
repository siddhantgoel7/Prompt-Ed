// Sticky header for an active lesson session.
// Contains three zones:
//   Left   — PromptED logo + lesson title (truncated on small screens)
//   Center — Live join PIN + mini QR thumbnail (links to the join URL in a new tab)
//   Right  — ThemeToggle + HamburgerMenu (Display QR/Code, Split View, Settings, End Session)
//
// The HamburgerMenu collapses all session action buttons behind a 3-line icon so the
// header stays uncluttered on small viewports. ThemeToggle remains outside the menu
// because theme switching is a persistent preference, not a one-off session action.
//
// Data sourcing (dual-mode for testability):
//   In production the component reads everything from SessionContext.
//   In Jest tests SessionContext is not available, so explicit props are used as fallback.
//   This avoids the need to wrap every test in a context provider.
'use client';

import * as React from 'react';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useStudentJoinQR } from '@/hooks/useStudentJoinQR';
import { SessionContext } from './SessionContext';

/**
 * Hamburger (☰) dropdown menu housing session action buttons.
 *
 * Items:
 *   "Display QR/Code" — opens full-screen projector view (SessionDisplayView)
 *   "Split View"      — enters split-screen mode showing slide + responses side by side
 *   "Settings"        — placeholder (not yet wired)
 *   "End Session"     — ends the lesson; shown in red as a destructive action
 *
 * The menu closes on any outside click via a document-level mousedown listener.
 * The listener is only registered while the menu is open (guard: `if (!open) return`)
 * to avoid unnecessary global event overhead.
 */
function HamburgerMenu({
  onDisplay,
  onSplitView,
  onEnd,
  endingLesson,
}: {
  onDisplay?: () => void;
  onSplitView?: () => void;
  onEnd?: () => void;
  /** True while the end-lesson request is in-flight — disables the button to prevent double-firing. */
  endingLesson?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close the dropdown when the user clicks anywhere outside the menu wrapper.
  // The listener is added only when open=true and cleaned up when open=false,
  // so it never runs while the menu is hidden.
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const menuItems: { label: string; onClick?: () => void; danger?: boolean; disabled?: boolean }[] = [
    { label: 'Display QR/Code', onClick: () => { onDisplay?.(); setOpen(false); } },
    { label: 'Split View',      onClick: () => { onSplitView?.(); setOpen(false); } },
    { label: 'Settings' }, // TODO: wire up settings panel
    { label: endingLesson ? 'Ending…' : 'End Session', onClick: () => { onEnd?.(); setOpen(false); }, danger: true, disabled: endingLesson },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Session menu"
        aria-expanded={open}
        className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-[10px] transition-all duration-150"
        style={{
          background: open ? 'rgba(45,158,45,0.12)' : 'var(--surface-raised)',
          border: open ? '1px solid rgba(45,158,45,0.35)' : '1px solid var(--border-default)',
          color: open ? 'var(--color-primary-500)' : 'var(--text-secondary)',
        }}
      >
        <span className="block w-4 h-[2px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-4 h-[2px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-4 h-[2px] rounded-full" style={{ background: 'currentColor' }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
          style={{
            minWidth: '160px',
            background: 'var(--surface-overlay)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
            zIndex: 100,
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              disabled={item.disabled}
              className="w-full px-4 py-2.5 text-left text-sm font-medium transition-colors duration-100 disabled:opacity-50"
              style={{
                color: item.danger ? '#ef4444' : 'var(--text-primary)',
                background: 'transparent',
                borderBottom: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = item.danger
                  ? 'rgba(239,68,68,0.10)'
                  : 'rgba(45,158,45,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Active-session header with logo, lesson title, join PIN code, Display/End/Split View/Settings buttons.
 * Reads values from SessionContext when available, falling back to explicit props for testing.
 */
export function SessionHeaderActive(props: {
  title?: string;
  lessonId?: string;
  pinCode?: string | null;
  endingLesson?: boolean;
  onDisplay?: () => void;
  onEnd?: () => void;
  onSplitView: () => void;
}) {
  const context = React.useContext(SessionContext);
  const title = context ? context.lesson.title : props.title!;
  const lessonId = context ? context.lesson.id : props.lessonId;
  const pinCode = context ? context.lesson.pin_code : props.pinCode!;
  const endingLesson = context ? context.endingLesson : props.endingLesson!;
  const onDisplay = context ? context.handleDisplay : props.onDisplay!;
  const onEnd = context ? context.handleEnd : props.onEnd!;
  const onSplitView = props.onSplitView;
  const { joinUrl, qrDataUrl } = useStudentJoinQR(lessonId, 96);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="px-4 md:px-5 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size="sm" className="flex-shrink-0 hidden sm:block" />
          <div
            className="hidden sm:block w-px h-5 flex-shrink-0"
            style={{ background: 'var(--border-default)' }}
          />
          <h1
            className="text-sm md:text-base font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h1>
        </div>

        {/* Center: join code + QR */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            background: 'rgba(45,158,45,0.10)',
            border: '1px solid rgba(45,158,45,0.25)',
          }}
        >
          {joinUrl ? (
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open student lesson link"
              className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Join QR" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>QR</span>
              )}
            </a>
          ) : null}
          <span className="text-xs font-semibold" style={{ color: 'var(--color-primary-600)' }}>
            PIN: <span className="font-mono tracking-widest">{pinCode ?? '------'}</span>
          </span>
        </div>

        {/* Right: theme toggle + hamburger menu */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <ThemeToggle />
          <HamburgerMenu
            onDisplay={onDisplay}
            onSplitView={onSplitView}
            onEnd={onEnd}
            endingLesson={endingLesson}
          />
        </div>
      </div>
    </header>
  );
}
