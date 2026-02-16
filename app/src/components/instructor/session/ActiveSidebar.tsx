'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import Link from 'next/link';
import { useParams } from 'next/navigation';

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function truncateText(text: string, maxLength: number = 80) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function DiscussionHistory({
  discussions,
  activeDiscussionId,
}: {
  discussions: DiscussionWithResponseCount[];
  activeDiscussionId: string | null;
}) {
  const params = useParams();
  const lessonId = params.lessonId as string;
  
  if (discussions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No discussions yet</p>
        <p className="text-xs text-muted-foreground mt-1">Start a discussion to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {discussions.map((d, index) => {
        const isActive = d.id === activeDiscussionId;

        return (
          <Link 
            key={d.id} 
            href={`/session/${lessonId}/discussion/${d.id}`}
            className="block" // Ensures the link behaves like a block element
          >
            <Card
              className={[
                'cursor-pointer transition-colors',
                isActive ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
              ].join(' ')}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>

                  {d.status === 'active' ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Closed
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-foreground/90 mb-2 leading-relaxed">
                  {truncateText(d.prompt_text)}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{d.response_count}</span>
                  <span>{d.response_count === 1 ? 'response' : 'responses'}</span>

                  {d.published_at ? (
                    <>
                      <span>•</span>
                      <span>{formatTime(d.published_at)}</span>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function ActiveSidebar({
  discussions,
  activeDiscussionId,
  responses,
}: {
  discussions: DiscussionWithResponseCount[];
  activeDiscussionId: string | null;
  responses: Response[];
}) {
  return (
    <aside className="w-full md:w-72 border-r bg-white">
      <div className="p-4">
        <Tabs defaultValue="discussions" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="discussions" className="flex-1">
              Discussions
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1">
              Files
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="mt-4">
            <ScrollArea className="h-[calc(100vh-170px)] pr-2">
              <DiscussionHistory 
                discussions={discussions} 
                activeDiscussionId={activeDiscussionId}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <div className="text-sm text-muted-foreground">
              Files UI coming next (keeping behavior unchanged).
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Student Responses</div>
                  <div className="text-xs text-muted-foreground">{responses.length}</div>
                </div>

                <ScrollArea className="h-[calc(100vh-230px)] pr-2">
                  {responses.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">Waiting for student responses...</p>
                  ) : (
                    <div className="space-y-2">
                      {responses.map((r) => (
                        <Card key={r.id}>
                          <CardContent className="p-3">
                            <p className="text-sm">{r.response_text}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(r.created_at).toLocaleTimeString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

        </Tabs>
      </div>
    </aside>
  );
}
