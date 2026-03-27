/**
 * Tests for src/lib/utils.ts.
 * Covers: cn() class merging, formatTime() < 24h branch (time string)
 * and ≥ 24h branch (date string), truncateText() short-text pass-through
 * and long-text truncation.
 */
import { cn, formatTime, truncateText } from '@/lib/utils';

describe('cn', () => {
  it('merges class names without conflicts', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    // tailwind-merge: p-2 overrides p-4 when both are present
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'skipped', 'included')).toBe('base included');
  });
});

describe('formatTime', () => {
  it('returns a time string for a timestamp < 24 hours ago', () => {
    // Timestamp 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = formatTime(oneHourAgo);
    // Should be a time string like "11:30 AM" — check AM/PM pattern
    expect(result).toMatch(/AM|PM/i);
  });

  it('returns a date string for a timestamp ≥ 24 hours ago', () => {
    // Timestamp 48 hours ago
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const result = formatTime(twoDaysAgo);
    // Should be a short date like "Mar 15" — check it contains a month abbreviation
    expect(result).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });
});

describe('truncateText', () => {
  it('returns text unchanged when at or below maxLength', () => {
    const short = 'Short text';
    expect(truncateText(short)).toBe(short);
  });

  it('truncates text and appends ellipsis when over maxLength', () => {
    const long = 'A'.repeat(81);
    const result = truncateText(long);
    expect(result).toHaveLength(83); // 80 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('respects a custom maxLength', () => {
    const text = 'Hello World';
    const result = truncateText(text, 5);
    expect(result).toBe('Hello...');
  });

  it('returns text exactly at maxLength without truncation', () => {
    const exactly80 = 'B'.repeat(80);
    expect(truncateText(exactly80)).toBe(exactly80);
  });
});
