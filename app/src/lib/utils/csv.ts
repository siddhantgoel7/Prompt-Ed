/**
 * Shared CSV utilities used by export handlers in useSessionPage.
 *
 * escapeCsv   — wraps a value in double-quotes and escapes embedded quotes.
 * formatExportTimestamp — converts a nullable ISO string to an ISO 8601 string
 *   suitable for CSV data that will be opened in spreadsheet tools.
 */

/**
 * Wraps `value` in double-quotes and escapes any embedded double-quote characters
 * by doubling them (per RFC 4180).
 * Converts null / undefined to an empty string before quoting.
 */
export function escapeCsv(value: string | number | null | undefined): string {
  const stringValue = String(value ?? '');
  return `"${stringValue.replaceAll(/"/g, '""')}"`;
}

/**
 * Converts a nullable timestamp string to an ISO 8601 string (UTC).
 * Returns an empty string when the value is null or undefined so that CSV
 * cells are left blank rather than showing "Invalid Date".
 *
 * The TXT overview handler uses toLocaleString() deliberately for human
 * readability, but CSV data consumed by analysis tools should be in a
 * standardised format that is locale-independent.
 */
export function formatExportTimestamp(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString();
}
