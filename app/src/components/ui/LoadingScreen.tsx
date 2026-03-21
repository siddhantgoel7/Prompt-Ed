// Full-screen loading indicator used across all async page boundaries.
//
// Animation notes:
//   - logoBreath and dotBounce keyframes are defined in globals.css (not here) so that
//     AIPreferencesDialog, StudentSessionPage, and create_instructor/page.tsx can also
//     reference them without requiring LoadingScreen to be mounted first.
//   - Previously these keyframes were injected via a <style> tag inside this component,
//     which caused hydration mismatches in Next.js SSR and silently broke the animations
//     in components that used dotBounce without rendering LoadingScreen.
'use client';

import Image from 'next/image';

/**
 * Full-screen loading state: the simple PromptED logo with a gentle breathing animation
 * and a three-dot bounce loader beneath it.
 *
 * Usage: drop into any async boundary or loading state — the component is self-contained
 * and fills the full viewport height.
 */
export function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      data-testid="loading-screen"
      style={{ background: 'var(--surface-base)' }}
    >
      {/* Logo with a slow scale+opacity pulse — defined as @keyframes logoBreath in globals.css */}
      <div style={{ animation: 'logoBreath 2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' }}>
        <Image
          src="/prompted_logo_simple.svg"
          alt="PromptED"
          width={200}
          height={59}
          priority
          className="logo-dark-adaptive"
          style={{ height: 'auto' }}
        />
      </div>

      {/* Three-dot bounce loader — dots staggered 200 ms apart via inline animationDelay.
          @keyframes dotBounce is in globals.css. */}
      <div className="flex items-center gap-1.5" aria-label="Loading" role="status">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--color-primary-400)',
              animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
