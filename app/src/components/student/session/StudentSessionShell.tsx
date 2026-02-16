// src/components/student/session/StudentSessionShell.tsx
'use client';

import { PropsWithChildren } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StudentSessionShell({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) {
  return (
    <div className="min-h-[calc(100vh-1px)] bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-xl md:text-2xl">
            {title || 'Session'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}
