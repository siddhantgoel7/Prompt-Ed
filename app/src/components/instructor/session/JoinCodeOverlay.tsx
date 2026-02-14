'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function JoinCodeOverlay({
  open,
  code,
  onClose,
}: {
  open: boolean;
  code: string | null;
  onClose?: () => void;
}) {
  // If there is no code, keep behavior safe: nothing to show.
  if (!code) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // When user closes (X / ESC / outside click), reflect that in state.
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Code</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center py-10">
          <div className="text-6xl md:text-7xl font-bold tracking-wider">{code}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
