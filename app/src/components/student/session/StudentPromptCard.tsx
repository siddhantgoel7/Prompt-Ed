// src/components/student/session/StudentPromptCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StudentPromptCard({ prompt }: { prompt: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Discussion prompt</CardTitle>
      </CardHeader>
      <CardContent className="text-base leading-relaxed">{prompt}</CardContent>
    </Card>
  );
}
