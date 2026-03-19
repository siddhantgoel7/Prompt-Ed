'use client';

import Image from 'next/image';

/**
 * Full-screen loading state: the simple PromptED logo with a gentle pulse animation.
 * Used across all loading pages for consistency.
 */
export function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--surface-base)' }}
    >
      <div
        style={{
          animation: 'logoBreath 2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite',
        }}
      >
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

      {/* Three dot bounce loader */}
      <div className="flex items-center gap-1.5">
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

      <style>{`
        @keyframes logoBreath {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.96); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
