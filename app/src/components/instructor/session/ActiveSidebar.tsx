// Left sidebar for the active session view with tabbed panels for discussions, files, and analytics.
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { LessonFile } from '@/types/ai';
import { SessionContext } from './SessionContext';
import { DiscussionHistory } from './DiscussionHistory';
import { FilesTab } from './FilesTab';
import { DiscussionAnalyticsModal } from './ActiveRightPanel';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';

// ---------------------------------------------------------------------------
// Analytics Tab
// ---------------------------------------------------------------------------

/** Renders all discussions as clickable cards; clicking one opens the analytics modal. */
function AnalyticsTab({
  discussions,
  peakStudentCount,
}: {
  discussions: DiscussionWithResponseCount[];
  peakStudentCount: number;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [modalResponses, setModalResponses] = React.useState<Response[]>([]);
  const [loadingResponses, setLoadingResponses] = React.useState(false);

  const selectedDiscussion = discussions.find((d) => d.id === selectedId) ?? null;

  async function openAnalytics(discussionId: string) {
    setSelectedId(discussionId);
    setLoadingResponses(true);
    const data = await fetchResponsesApi(discussionId, true);
    setModalResponses(data);
    setLoadingResponses(false);
  }

  function closeModal() {
    setSelectedId(null);
    setModalResponses([]);
  }

  if (discussions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No discussions yet. Publish a prompt to get started.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {[...discussions].reverse().map((d, i) => {
          const promptNumber = discussions.length - i;
          const isActive = d.status === 'active';
          // For active discussions use the live peak; for closed ones use the saved snapshot
          const snapshot = isActive
            ? Math.max(d.participant_snapshot ?? 0, peakStudentCount) || null
            : d.participant_snapshot || null;
          const safeSnapshot = snapshot ?? 0;
          const responseRate =
            safeSnapshot > 0 ? Math.round((d.response_count / safeSnapshot) * 100) : null;

          return (
            <Button
              key={d.id}
              variant="outline"
              className="w-full h-auto p-3 flex flex-col items-start gap-1 text-left"
              onClick={() => openAnalytics(d.id)}
            >
              {/* Top row: number + status badge */}
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-gray-500">
                  Prompt #{promptNumber}
                </span>
                <Badge
                  variant="secondary"
                  className={
                    isActive
                      ? 'bg-green-100 text-green-800 text-[10px]'
                      : 'bg-gray-100 text-gray-600 text-[10px]'
                  }
                >
                  {isActive ? 'Active' : 'Closed'}
                </Badge>
              </div>

              {/* Prompt text */}
              <p className="text-sm text-gray-800 line-clamp-2 w-full">
                {d.prompt_text}
              </p>

              {/* Headline stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>{d.response_count} responses</span>
                {responseRate !== null && <span>{responseRate}% rate</span>}
                {safeSnapshot > 0 && <span>{snapshot} students</span>}
              </div>
            </Button>
          );
        })}
      </div>

      {/* Analytics modal — shared component also used by the right panel */}
      <DiscussionAnalyticsModal
        open={Boolean(selectedId) && !loadingResponses}
        onClose={closeModal}
        discussion={selectedDiscussion}
        responses={modalResponses}
        studentCount={peakStudentCount}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// ActiveSidebar
// ---------------------------------------------------------------------------

/** Renders the session sidebar with Discussions, Files, and Analytics tabs. */
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
  // peakStudentCount: highest count seen during the current discussion — only goes up
  const peakStudentCount = context ? context.peakStudentCount : (props.studentCount ?? 0);

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
            <ScrollArea className="h-[calc(100vh-170px)] pr-2">
              <AnalyticsTab
                discussions={discussions}
                peakStudentCount={peakStudentCount}
              />
            </ScrollArea>
          </TabsContent>

        </Tabs>
      </div>
    </aside>
  );
}