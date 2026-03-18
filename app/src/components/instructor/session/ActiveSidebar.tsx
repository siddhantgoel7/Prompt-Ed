// Left sidebar for the active session view with tabbed panels for discussions and files.
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { LessonFile } from '@/types/ai';
import { SessionContext } from './SessionContext';
import { DiscussionHistory } from './DiscussionHistory';
import { FilesTab } from './FilesTab';

// ---------------------------------------------------------------------------
// ActiveSidebar
// ---------------------------------------------------------------------------

/** Renders the session sidebar with Discussions and Files tabs. */
export function ActiveSidebar(props: {
  discussions?: DiscussionWithResponseCount[];
  activeDiscussionId?: string | null;
  responses?: Response[];
  files?: LessonFile[];
  isUploading?: boolean;
  onUploadFile?: (file: File) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
  studentCount?: number;
}) {
  const context = React.useContext(SessionContext);
  const discussions = context ? context.discussions : props.discussions!;
  const activeDiscussionId = context ? (context.activeDiscussion?.id ?? null) : props.activeDiscussionId!;
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

        </Tabs>
      </div>
    </aside>
  );
}