// Sticky header for an active lesson session.
// Contains three zones:
//   Left   — PromptED logo + lesson title (truncated on small screens)
//   Center — Live join PIN + mini QR thumbnail (links to the join URL in a new tab)
//   Right  — ThemeToggle + HamburgerMenu (Display QR/Code, Split View, Settings, End Session)
//
// The HamburgerMenu lives in HamburgerMenu.tsx — extracted because it has its own
// state, refs, effects, and is self-contained and potentially reusable.
//
// ThemeToggle remains outside the menu because theme switching is a persistent
// preference, not a one-off session action.
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
import { HamburgerMenu } from './HamburgerMenu';

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
      className="sticky top-0 z-50 bg-surface-glass backdrop-blur-md border-b border-line-default"
    >
      <div className="px-4 md:px-5 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size="sm" className="flex-shrink-0 hidden sm:block" />
          <div className="hidden sm:block w-px h-5 flex-shrink-0 bg-line-default" />
          <h1 className="text-sm md:text-base font-semibold truncate text-content-primary">
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
              className="w-7 h-7 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center bg-surface-raised border border-line-default"
            >
              {qrDataUrl ? (
                // QR is a base64 data URL — cannot be optimised by next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Join QR" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] font-mono text-content-muted">QR</span>
              )}
            </a>
          ) : null}
          <span className="text-xs font-semibold text-brand-600">
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
