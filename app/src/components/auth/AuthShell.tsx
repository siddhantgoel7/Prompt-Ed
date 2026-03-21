// Shared layout shell for all auth pages (login, sign-up).
// Provides the background, decorative blobs, theme toggle, logo, centered card, and footer
// so individual auth forms (LoginForm, SignUpForm) only need to render their own fields.
//
// The glassmorphism card uses the .glass utility class (globals.css) for the
// background/backdrop/border block, keeping the JSX style prop to just the box-shadow.
// Decorative blob divs are aria-hidden so screen readers skip them.
import { PropsWithChildren } from 'react';
import { AppLogo } from '@/components/ui/AppLogo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

type AuthShellProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

/** Renders a centered glassmorphism card with logo, title and optional description, wrapping auth form content. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-primary-300), transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--color-primary-400), transparent 70%)' }}
      />

      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Logo above card */}
      <div className="mb-8 enter">
        <AppLogo size="md" variant="simple" />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md enter"
        style={{ animationDelay: '60ms' }}
      >
        <div
          className="glass rounded-2xl p-8 space-y-6"
          style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.06) inset' }}
        >
          <div className="space-y-1">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h1>
            {description ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {description}
              </p>
            ) : null}
          </div>

          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Department of Pharmacology · University of Alberta
      </p>
    </div>
  );
}
