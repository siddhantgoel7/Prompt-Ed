// Top navigation header for the lessons page with the logo and a Back button.
'use client';

import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/** Renders the lessons page header bar with the app logo and a Back navigation button. */
export function LessonsPageHeader({
  title: _title,
  onBack,
}: Readonly<{
  title: string;
  onBack: () => void;
}>) {
  return (
    <header
      className="glass sticky top-0 z-50"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <AppLogo size="sm" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium transition-all duration-150 bg-surface-raised text-content-secondary"
            style={{
              border: '1px solid var(--border-default)',
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
        </div>
      </div>
    </header>
  );
}
