// Full-screen not-found state shown when the requested lesson does not exist.
import * as React from 'react';

/** Renders a centered "Lesson not found" message when the lesson ID is invalid. */
export function SessionNotFound() {
  // Keep exact string for tests
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-base)' }}>
      <p style={{ color: 'var(--text-muted)' }}>Lesson not found</p>
    </div>
  );
}
