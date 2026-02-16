'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import type { Response } from '@/types/response';

export function ActiveRightPanel({ responses }: { responses: Response[] }) {
  return (
    <aside className="w-80 max-md:w-full border-l border-gray-300 p-4 md:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Live Responses</div>
        <div className="text-sm text-gray-500">{responses.length}</div>
      </div>

      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Waiting for student responses...
          </p>
        ) : (
          <div className="space-y-2 pr-2">
            {responses.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {r.response_text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
