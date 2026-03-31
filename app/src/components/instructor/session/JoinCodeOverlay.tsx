// Modal dialog that displays the lesson join code in large text for students to see on screen.
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { SessionContext } from './SessionContext';

/** Renders a dialog overlay showing the PIN code in large font for in-class projection. */
export function JoinCodeOverlay(props: Readonly<{
  open?: boolean;
  code?: string | null;
  onClose?: () => void;
}>) {
  const context = React.useContext(SessionContext);
  const open = context ? context.displayState : props.open!;
  const code = context ? (context.lesson?.pin_code ?? null) : props.code!;
  const onClose = context ? () => { if (open) context.handleDisplay(); } : props.onClose!;
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
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
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
