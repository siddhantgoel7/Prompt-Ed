// src/components/student/session/StudentWaitingCard.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';

export function StudentWaitingCard({ text }: { text?: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {text || 'Waiting for the instructor to publish a discussion…'}
      </CardContent>
    </Card>
  );
}
