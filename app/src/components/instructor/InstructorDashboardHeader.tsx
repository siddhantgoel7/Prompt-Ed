// Top navigation bar for the instructor dashboard with the app logo and logout/theme controls.
'use client';

import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useRouter } from 'next/navigation';

/** Renders the dashboard header bar with the PromptED logo and a Log-Out button. */
export function InstructorDashboardHeader({
  loggingOut,
  onLogout,
}: Readonly<{
  loggingOut: boolean;
  onLogout: () => void;
}>) {
  const router = useRouter();

  return (
    <header
      className="glass sticky top-0 z-50"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <AppLogo size="sm" />

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => router.push('/account')}
            className="px-4 py-2 rounded-[10px] text-sm font-medium transition-all duration-150 bg-surface-raised text-content-secondary"
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
            Account
          </button>

          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="px-4 py-2 rounded-[10px] text-sm font-medium transition-all duration-150 disabled:opacity-60 bg-surface-raised text-content-secondary"
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
            {loggingOut ? 'Logging out…' : 'Log Out'}
          </button>
        </div>
      </div>
    </header>
  );
}
