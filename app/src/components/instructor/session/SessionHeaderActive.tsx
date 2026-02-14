'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export function SessionHeaderActive({
  title,
  pinCode,
  endingLesson,
  onDisplay,
  onEnd,
}: {
  title: string;
  pinCode: string | null;
  endingLesson: boolean;
  onDisplay: () => void;
  onEnd: () => void;
}) {
  return (
    <header className="border-b border-gray-300 px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-lg md:text-xl font-semibold truncate">{title}</h1>

      <div className="flex flex-wrap items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 border border-gray-300 flex items-center justify-center text-xs">
            QR
          </div>
          <span className="font-semibold text-sm md:text-base">Join Code: {pinCode || '124567'}</span>
        </div>

        <Button size="sm" onClick={onDisplay}>Display</Button>

        {/* Keep label "End" for tests */}
        <Button size="sm" onClick={onEnd} disabled={endingLesson} variant="destructive">
          {endingLesson ? 'Ending...' : 'End'}
        </Button>

        <Button size="sm" variant="secondary">Settings</Button>
      </div>
    </header>
  );
}
