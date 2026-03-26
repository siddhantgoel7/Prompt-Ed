// Student home page — the first screen every student sees.
// Allows joining a live session by entering a 6-digit PIN provided by their instructor.
// Also surfaces instructor Log in / Sign up links in the header for non-students.
//
// Animation notes:
//   "AI-Assisted Learning" uses BlurText (src/components/ui/BlurText.tsx) — each
//   character animates from filter:blur(10px)/opacity:0 to clear, staggered 45 ms.
//   The @keyframes blurIn animation is defined in globals.css.
//
//   The hero section and join card use the .enter class (fadeSlideUp, globals.css)
//   with a 60 ms delay on the card so they arrive sequentially, not simultaneously.
'use client';

import { useHomeJoin } from '@/hooks/useHomeJoin';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BlurText } from '@/components/ui/BlurText';

/** Renders the student home page with a PIN entry card and instructor navigation links. */
export function HomeJoin() {
  const { code, onChangeCode, join, goSignUp, goLogIn, view, error, pinOk } = useHomeJoin();

  if (view === 'checking-auth') {
    return <LoadingScreen />;
  }

  const joining = view === 'joining';

  return (
    <div className="min-h-screen flex flex-col bg-surface-base">
      {/* Header */}
      <header
        className="glass sticky top-0 z-50"
      >
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <AppLogo size="sm" />

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={goLogIn}
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
        {/* Decorative background blobs */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-primary-alpha-10), transparent 65%)' }}
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-primary-400-alpha-08), transparent 65%)' }}
        />

        {/* Hero */}
        <div className="text-center mb-10 enter">
          <AppLogo size="xl" variant="simple" className="mx-auto mb-3" />
          <BlurText
            text="AI-Assisted Learning"
            className="block text-lg tracking-[0.08em] mb-6 text-content-secondary"
            style={{
              fontFamily: '"Playfair Display", Georgia, "Times New Roman", serif',
              letterSpacing: '0.12em',
            }}
          />
          <p className="text-base max-w-sm mx-auto text-content-muted">
            Enter your instructor&apos;s session PIN to join the live discussion.
          </p>
        </div>

        {/* Join card */}
        <div
          className="glass w-full max-w-md rounded-2xl p-8 enter"
          style={{ animationDelay: '60ms', boxShadow: '0 4px 32px var(--color-black-alpha-08)' }}
        >
          <h2 className="text-xl font-bold mb-1 text-content-primary">
            Join a Session
          </h2>
          <p className="text-sm mb-6 text-content-muted">
            Enter the 6-digit PIN provided by your instructor.
          </p>

          {error ? (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                background: 'var(--color-error-alpha-08)',
                border: '1px solid var(--color-error-alpha-25)',
                borderLeft: '3px solid var(--color-error-500)',
              }}
            >
              <p className="text-sm font-semibold text-err-600">Can&apos;t join</p>
              <p className="text-sm text-err-500">{error}</p>
            </div>
          ) : null}

          <div className="space-y-1.5 mb-4">
            <label
              htmlFor="pin"
              className="block text-sm font-medium text-content-secondary"
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
              className="w-full px-4 py-3.5 rounded-[10px] text-center text-2xl font-bold tracking-[0.5em] transition-all duration-150 bg-surface-raised text-content-primary"
              style={{
                border: '1px solid var(--border-default)',
                fontFamily: 'monospace',
              }}
            />
            {/* data-testid="pin-hint" is the test anchor — avoids unicode ✓ character dependency */}
            <p data-testid="pin-hint" className="text-xs text-content-muted">
              {(() => {
                if (code.length === 0) return 'PIN is 6 digits';
                return pinOk ? '✓ Looks good' : 'Enter exactly 6 digits';
              })()}
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

          <p className="text-xs text-center mt-4 text-content-muted">
            Instructors: use{' '}
            <button
              onClick={goLogIn}
              className="font-medium hover:underline text-brand-500"
            >
              Log in
            </button>{' '}
            to access your dashboard.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-content-muted">
          Department of Pharmacology · University of Alberta
        </p>
      </footer>
    </div>
  );
}
