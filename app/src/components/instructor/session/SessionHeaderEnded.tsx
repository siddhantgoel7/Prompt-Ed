'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export function SessionHeaderEnded({
  title,
  exporting,
  activating,
  onExport,
  onActivate,
}: {
  title: string;
  exporting: boolean;
  activating: boolean;
  onExport: () => void;
  onActivate: () => void;
}) {
  return (
    <header className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        <Button onClick={onExport} disabled={exporting} variant="default">
          {exporting ? 'Exporting...' : 'Export Txt'}
        </Button>

        <Button onClick={onActivate} disabled={activating} variant="secondary">
          {activating ? 'Activating...' : 'Activate'}
        </Button>
      </div>
    </header>
  );
}
