// Full-screen loading state shown while the session page fetches lesson data.
import * as React from 'react';

/** Renders a centered "Loading..." message while session data is being fetched. */
export function SessionLoading() {
  // Keep exact string for tests
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
