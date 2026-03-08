'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { LessonFile } from '@/types/ai';
import { SessionContext } from './SessionContext';
import { DiscussionHistory } from './DiscussionHistory';
import { FilesTab } from './FilesTab';



export function ActiveSidebar(props: {
  discussions?: DiscussionWithResponseCount[];
  activeDiscussionId?: string | null;
  responses?: Response[];
  files?: LessonFile[];
  isUploading?: boolean;
  onUploadFile?: (file: File) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
}) {
  const context = React.useContext(SessionContext);
  const discussions = context ? context.discussions : props.discussions!;
  const activeDiscussionId = context ? (context.activeDiscussion?.id ?? null) : props.activeDiscussionId!;
  const responses = context ? context.responses : props.responses!;
  const files = context ? context.files : props.files!;
  const isUploading = context ? context.isUploading : props.isUploading!;
  const onUploadFile = context ? context.uploadFile : props.onUploadFile!;
  const onDeleteFile = context ? context.deleteFile : props.onDeleteFile!;
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
            <FilesTab
              files={files}
              isUploading={isUploading}
              onUploadFile={onUploadFile}
              onDeleteFile={onDeleteFile}
            />
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
