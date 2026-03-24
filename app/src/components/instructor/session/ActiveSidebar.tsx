// Left sidebar for the active session view with tabbed panels for discussions and files.
// Supports collapsing to a narrow icon strip.
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

/** Renders the session sidebar with Discussions and Files tabs. Supports collapsing. */
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

  const [collapsed, setCollapsed] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('discussions');

  function openTab(tab: string) {
    setActiveTab(tab);
    setCollapsed(false);
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-all duration-200 bg-surface-raised border-r border-line-default"
      style={{
        width: collapsed ? '52px' : '280px',
      }}
    >
      {/* Collapse toggle */}
      <div
        className="flex items-center px-3 py-2.5 flex-shrink-0 border-b border-line-subtle"
      >
        {!collapsed && (
          <span
            className="text-xs font-semibold uppercase tracking-wider flex-1 text-content-muted"
          >
            Session Panel
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 flex-shrink-0 text-content-muted"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          {collapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          )}
        </button>
      </div>

      {/* Collapsed state: icon buttons */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 pt-4 px-2">
          <button
            title="Discussions"
            onClick={() => openTab('discussions')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{ color: activeTab === 'discussions' ? 'var(--color-primary-500)' : 'var(--text-muted)', background: activeTab === 'discussions' ? 'rgba(45,158,45,0.10)' : 'transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = activeTab === 'discussions' ? 'rgba(45,158,45,0.10)' : 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = activeTab === 'discussions' ? 'var(--color-primary-500)' : 'var(--text-muted)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button
            title="Files"
            onClick={() => openTab('files')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{ color: activeTab === 'files' ? 'var(--color-primary-500)' : 'var(--text-muted)', background: activeTab === 'files' ? 'rgba(45,158,45,0.10)' : 'transparent' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.10)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-500)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = activeTab === 'files' ? 'rgba(45,158,45,0.10)' : 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = activeTab === 'files' ? 'var(--color-primary-500)' : 'var(--text-muted)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
        </div>
      ) : (
        /* Expanded: full tab panel */
        <div className="flex-1 overflow-hidden p-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-2 mb-3">
              <TabsTrigger value="discussions" className="text-xs">Discussions</TabsTrigger>
              <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
            </TabsList>

            <TabsContent value="discussions" className="mt-0 flex-1">
              <ScrollArea className="h-[calc(100vh-130px)] pr-1">
                <DiscussionHistory
                  discussions={discussions}
                  activeDiscussionId={activeDiscussionId}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="files" className="mt-0 flex-1">
              <FilesTab
                files={files}
                isUploading={isUploading}
                onUploadFile={onUploadFile}
                onDeleteFile={onDeleteFile}
              />
            </TabsContent>

          </Tabs>
        </div>
      )}
    </aside>
  );
}
