// Placeholder card shown to students while waiting for the instructor to publish a question.
// src/components/student/session/StudentWaitingCard.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';

/** Renders a centered waiting message inside a card while no discussion is active. */
export function StudentWaitingCard({ text }: { text?: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {text || 'Waiting for the instructor to publish a discussion…'}
      </CardContent>
    </Card>
  );
}
