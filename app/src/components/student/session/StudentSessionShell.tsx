// Centered card wrapper used by all student session views to maintain consistent layout.
// src/components/student/session/StudentSessionShell.tsx
'use client';

import { PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function StudentSessionShell({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <AppLogo size="sm" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => router.push('/')}
            className="px-3 py-1.5 rounded-[8px] text-xs font-medium text-white transition-all duration-150"
            style={{ background: 'oklch(0.577 0.245 27.325)' }}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl space-y-4">
          {/* Session title */}
          {title && (
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h1>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          PromptED · AI-Assisted Teaching
        </p>
      </footer>
    </div>
  );
}
