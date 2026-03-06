'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { LessonFile, UploadStatus } from '@/types/ai';
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
      {[...discussions].reverse().map((d, index) => {
        const originalIndex = discussions.length - index;
        const isActive = d.id === activeDiscussionId;

        return (
          <Link
            key={d.id}
            href={`/session/${lessonId}/discussion/${d.id}`}
            className="block"
          >
            <Card
              className={[
                'cursor-pointer transition-colors',
                isActive ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
              ].join(' ')}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">#{originalIndex}</span>

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

// US 1.16 — uploaded files provide context for AI prompt generation
function FilesTab({
  files,
  isUploading,
  onUploadFile,
  onDeleteFile,
}: {
  files: LessonFile[];
  isUploading: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      await onUploadFile(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800 text-xs">Ready</Badge>;
      case 'processing':
      case 'uploading':
        return <Badge className="bg-amber-100 text-amber-800 text-xs">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 text-xs">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.pptx"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading\u2026' : 'Upload File (PDF/PPTX)'}
      </button>

      {uploadError ? (
        <p className="text-xs text-red-600">{uploadError}</p>
      ) : null}

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No files uploaded yet. Upload a PDF or PPTX to enable AI prompt generation.
        </p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 p-2 border rounded-lg bg-white">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate" title={f.fileName}>{f.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{formatSize(f.fileSizeBytes)}</span>
                  {getStatusBadge(f.status)}
                </div>
              </div>
              <button
                onClick={() => onDeleteFile(f.id)}
                disabled={isUploading}
                className="shrink-0 p-1 hover:bg-red-50 hover:text-red-600 rounded disabled:opacity-50"
                title="Delete file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActiveSidebar({
  discussions,
  activeDiscussionId,
  responses,
  files,
  isUploading,
  onUploadFile,
  onDeleteFile,
}: {
  discussions: DiscussionWithResponseCount[];
  activeDiscussionId: string | null;
  responses: Response[];
  files: LessonFile[];
  isUploading: boolean;
  onUploadFile: (file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
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
