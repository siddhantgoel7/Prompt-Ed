'use client';

import { Button } from '@/components/ui/button';

export function InstructorDashboardHeader({
  loggingOut,
  onLogout,
}: {
  loggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">PMCOL Teaching Tool</h1>

        <Button onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Log-Out'}
        </Button>
      </div>
    </header>
  );
}
