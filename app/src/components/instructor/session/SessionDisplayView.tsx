// Full-page view for projecting session join information onto a classroom screen.
// Opened when the instructor clicks "Display QR/Code" in the session header menu.
// Renders in a new tab/window so the instructor's session view stays untouched.
//
// Layout: two glassmorphism cards side by side on large screens, stacked on mobile.
//   Left  — large PIN number in primary green (easy to read from the back of a room)
//   Right — QR code that students can scan to join directly without typing the PIN
//
// Dark/light mode: all colours use CSS variables (var(--surface-*), var(--text-*)) so
// the page respects the instructor's theme preference — no hardcoded bg-white/text-black.
'use client';

import { useStudentJoinQR } from '@/hooks/useStudentJoinQR';

export function SessionDisplayView(props: {
  lessonId: string;
  title: string;
  pinCode: string | null;
}) {
  const { lessonId, title, pinCode } = props;
  const { joinUrl, qrDataUrl } = useStudentJoinQR(lessonId, 520);
  const homepageUrl = joinUrl ? new URL(joinUrl).origin : null;

  return (
    <main
      className="min-h-screen px-8 py-10 md:px-12 md:py-12 bg-surface-base text-content-primary"
    >
      <header className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-content-muted">Live Session</p>
        <h1 className="mt-2 text-3xl md:text-5xl font-semibold text-content-primary">{title}</h1>
      </header>

      <section className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* PIN card */}
        <div className="glass rounded-2xl p-8 md:p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
          <p className="text-sm uppercase tracking-[0.2em] text-content-muted">
            Join PIN
          </p>
          <p className="mt-4 text-6xl md:text-8xl font-bold tracking-[0.12em] text-brand-500">
            {pinCode ?? '------'}
          </p>
          {homepageUrl ? (
            <p className="mt-4 text-sm text-content-secondary break-all">
              {homepageUrl}
            </p>
          ) : null}
        </div>

        {/* QR card */}
        <div className="glass rounded-2xl p-8 md:p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
          <p className="text-sm uppercase tracking-[0.2em] text-content-muted">
            Scan To Join
          </p>
          <div className="mt-4 flex items-center justify-center">
            {qrDataUrl ? (
              // QR code is a dynamically-generated base64 data URL — next/image cannot
              // optimize data: URLs, so a plain <img> is appropriate here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Join lesson QR code"
                className="w-64 h-64 md:w-80 md:h-80 rounded-xl"
              />
            ) : (
              <div
                className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center text-sm rounded-xl text-content-muted"
                style={{ border: '1px dashed var(--border-default)' }}
              >
                Generating QR...
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
