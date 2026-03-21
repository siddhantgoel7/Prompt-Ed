// Character-by-character blur entrance animation (inspired by ReactBits blur-text).
// Extracted from HomeJoin.tsx — a standalone, reusable UI effect component.
//
// Each character starts at filter:blur(10px) + opacity:0 and transitions to clear,
// with a configurable stagger so the text "types in" from left to right.
// The animation starts after an initial delay so preceding elements can land first.
//
// Spaces are replaced with \u00A0 (non-breaking space) so inline-block rendering
// does not collapse them and word spacing is preserved.
//
// @keyframes blurIn is defined in globals.css — NOT injected inline here.
'use client';

import type React from 'react';

interface BlurTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Delay before the first character animates, in ms. Default: 200. */
  initialDelay?: number;
  /** Extra delay between consecutive characters, in ms. Default: 45. */
  staggerMs?: number;
}

/**
 * Renders each character of `text` with a staggered blur-in animation.
 * The wrapper element carries `aria-label` so screen readers read the full string
 * rather than one character at a time.
 */
export function BlurText({ text, className = '', style, initialDelay = 200, staggerMs = 45 }: BlurTextProps) {
  const chars = text.split('');
  return (
    <span className={className} aria-label={text} style={style}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            animation: 'blurIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
            animationDelay: `${initialDelay + i * staggerMs}ms`,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
