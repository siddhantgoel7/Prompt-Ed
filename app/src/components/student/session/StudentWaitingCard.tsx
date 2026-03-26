// Placeholder card shown to students while waiting for the instructor to publish a question.
// src/components/student/session/StudentWaitingCard.tsx
'use client';

/** Renders a centered waiting message while no discussion is active. */
export function StudentWaitingCard({ text }: Readonly<{ text?: string }>) {
  return (
    <div
      className="rounded-2xl p-10 text-center enter"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Animated pulse indicator */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-primary-alpha-15)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          {/* Ping animation */}
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ background: 'var(--color-primary-300)' }}
          />
        </div>
      </div>

      <p className="font-semibold mb-1 text-content-primary">
        Waiting for next question
      </p>
      <p className="text-sm text-content-muted">
        {text || 'The instructor will publish a discussion prompt shortly…'}
      </p>
    </div>
  );
}
