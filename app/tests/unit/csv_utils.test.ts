/**
 * Unit Tests — CSV Export Utilities
 *
 * User Stories:
 *   [US 1.41] Export responses as a file
 *   [US 1.42] Export AI generated prompts and its responses as a file
 *   [US 1.43] Export appropriate lesson statistics
 *
 * These tests verify the two pure helper functions used by all three export
 * handlers so that any future regression in escaping or timestamp formatting
 * is caught immediately without requiring a full integration render.
 */

import { escapeCsv, formatExportTimestamp } from '@/lib/utils/csv';

// ---------------------------------------------------------------------------
// escapeCsv
// ---------------------------------------------------------------------------

describe('escapeCsv() [US 1.41][US 1.42][US 1.43]', () => {

  // 70.1
  it('[UT1] success: wraps a plain string in double-quotes', () => {
    expect(escapeCsv('hello')).toBe('"hello"');
  });

  // 70.2
  it('[UT2] success: escapes an embedded double-quote by doubling it (RFC 4180)', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  // 70.3
  it('[UT3] success: converts a number to a quoted string', () => {
    expect(escapeCsv(42)).toBe('"42"');
  });

  // 70.4
  it('[UT4] success: converts null to an empty quoted string', () => {
    expect(escapeCsv(null)).toBe('""');
  });

  // 70.5
  it('[UT5] success: converts undefined to an empty quoted string', () => {
    expect(escapeCsv(undefined)).toBe('""');
  });

  // 70.6
  it('[UT6] success: preserves commas inside the quoted field (so they are not treated as delimiters)', () => {
    expect(escapeCsv('a,b,c')).toBe('"a,b,c"');
  });

  // 70.7
  it('[UT7] success: preserves newlines inside the quoted field', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  // 70.8
  it('[UT8] success: handles an empty string', () => {
    expect(escapeCsv('')).toBe('""');
  });

  // 70.9
  it('[UT9] success: only the double-quote character is escaped — single quotes are left unchanged', () => {
    expect(escapeCsv("it's fine")).toBe('"it\'s fine"');
  });

  // 70.10
  it('[UT10] success: consecutive double-quotes are all escaped', () => {
    // Input: ""  (two double-quote chars)
    // Each " → ""  so the payload becomes """"
    // Wrapped in outer quotes: """"""  (6 chars)
    expect(escapeCsv('""')).toBe('""""""');
  });
});

// ---------------------------------------------------------------------------
// formatExportTimestamp
// ---------------------------------------------------------------------------

describe('formatExportTimestamp() [US 1.41][US 1.42][US 1.43]', () => {

  // 70.11
  it('[UT11] success: returns an ISO 8601 UTC string for a valid ISO input', () => {
    const result = formatExportTimestamp('2026-02-11T18:15:44.000Z');
    expect(result).toBe('2026-02-11T18:15:44.000Z');
  });

  // 70.12
  it('[UT12] success: returns empty string for null', () => {
    expect(formatExportTimestamp(null)).toBe('');
  });

  // 70.13
  it('[UT13] success: returns empty string for undefined', () => {
    expect(formatExportTimestamp(undefined)).toBe('');
  });

  // 70.14
  it('[UT14] success: returns empty string for empty string', () => {
    expect(formatExportTimestamp('')).toBe('');
  });

  // 70.15
  it('[UT15] success: converts a non-UTC timestamp to ISO 8601 UTC', () => {
    // 2026-02-11 18:00 EST = 2026-02-11 23:00 UTC
    const result = formatExportTimestamp('2026-02-11T18:00:00-05:00');
    expect(result).toBe('2026-02-11T23:00:00.000Z');
  });

  // 70.16
  it('[UT16] success: output is always locale-independent (contains Z suffix)', () => {
    const result = formatExportTimestamp('2026-03-17T14:00:00Z');
    expect(result.endsWith('Z')).toBe(true);
  });
});
