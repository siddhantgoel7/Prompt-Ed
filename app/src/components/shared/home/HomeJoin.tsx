// Home page component for students to join a live session by entering a 6-digit PIN.
// Also displays instructor Log in / Sign up navigation in the header.
'use client';

import { useHomeJoin } from '@/hooks/useHomeJoin';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

/** Renders the student home page with a PIN entry card and instructor navigation links. */
export function HomeJoin() {
  const { code, onChangeCode, join, goSignUp, goLogIn, view, error, pinOk } = useHomeJoin();

  if (view === 'checking-auth') {
    return <LoadingScreen />;
  }

  const joining = view === 'joining';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-base)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <AppLogo size="sm" />

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={goLogIn}
              className="px-4 py-2 rounded-[10px] text-sm font-medium transition-all duration-150"
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
              Log in
            </button>

            <button
              onClick={goSignUp}
              className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white transition-all duration-150 btn-primary-glow"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Background blobs */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(45,158,45,0.10), transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(61,181,61,0.08), transparent 65%)' }}
        />

        {/* Hero */}
        <div className="text-center mb-10 enter">
          <AppLogo size="xl" variant="full" className="mx-auto mb-6" />
          <p className="text-base max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Enter your instructor&apos;s session PIN to join the live discussion.
          </p>
        </div>

        {/* Join card */}
        <div
          className="w-full max-w-md rounded-2xl p-8 enter"
          style={{
            animationDelay: '60ms',
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
          }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Join a Session
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Enter the 6-digit PIN provided by your instructor.
          </p>

          {error ? (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderLeft: '3px solid #ef4444',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>Can&apos;t join</p>
              <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          ) : null}

          <div className="space-y-1.5 mb-4">
            <label
              htmlFor="pin"
              className="block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              PIN Code
            </label>
            <input
              id="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => onChangeCode(e.target.value)}
              disabled={joining}
              maxLength={6}
              className="w-full px-4 py-3.5 rounded-[10px] text-center text-2xl font-bold tracking-[0.5em] transition-all duration-150"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
              }}
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {code.length === 0
                ? 'PIN is 6 digits'
                : pinOk
                  ? '✓ Looks good'
                  : 'Enter exactly 6 digits'}
            </p>
          </div>

          <button
            onClick={join}
            disabled={joining || !pinOk}
            className="w-full py-3.5 rounded-[10px] text-sm font-semibold text-white transition-all duration-150 disabled:opacity-50 btn-primary-glow"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
            }}
          >
            {joining ? 'Joining…' : 'Join Session'}
          </button>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
            Instructors: use{' '}
            <button
              onClick={goLogIn}
              className="font-medium hover:underline"
              style={{ color: 'var(--color-primary-500)' }}
            >
              Log in
            </button>{' '}
            to access your dashboard.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Department of Pharmacology · University of Alberta
        </p>
      </footer>
    </div>
  );
}
