// Header bar for an active lesson session with the lesson title, join code, and control buttons.
'use client';

import * as React from 'react';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useStudentJoinQR } from '@/hooks/useStudentJoinQR';
import { SessionContext } from './SessionContext';

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

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <ThemeToggle />

          <button
            onClick={onDisplay}
            className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-150"
            style={{
              background: 'rgba(45,158,45,0.12)',
              color: 'var(--color-primary-600)',
              border: '1px solid rgba(45,158,45,0.25)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-500)';
              (e.currentTarget as HTMLButtonElement).style.color = 'white';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.12)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-600)';
            }}
          >
            Display
          </button>

          <button
            onClick={onSplitView}
            className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-150"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-400)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
            }}
          >
            Split View
          </button>

          <button
            className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all duration-150"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            Settings
          </button>

          <button
            onClick={onEnd}
            disabled={endingLesson}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-white transition-all duration-150 disabled:opacity-60"
            style={{ background: 'oklch(0.577 0.245 27.325)' }}
          >
            {endingLesson ? 'Ending…' : 'End'}
          </button>
        </div>
      </div>
    </header>
  );
}
