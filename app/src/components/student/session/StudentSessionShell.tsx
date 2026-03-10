'use client';

import { PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function StudentSessionShell({
  title,
  children,
}: PropsWithChildren<{ title?: string }>) {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-1px)] bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <CardTitle className="text-center text-xl md:text-2xl">
              {title || 'Session'}
            </CardTitle>
            <div className="flex-1 flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => router.push('/')}>
              Leave
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}