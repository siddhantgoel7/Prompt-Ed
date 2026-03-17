// Tab content panel for managing lesson file uploads (PDF/PPTX) in the active session sidebar.
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { X, FileSearch } from 'lucide-react'; // [DEV-INSPECT] FileSearch added for inspect button
import type { LessonFile, UploadStatus } from '@/types/ai';
// [DEV-INSPECT] start — dialog + tabs + scroll-area imports for chunk inspector
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// [DEV-INSPECT] end

// [DEV-INSPECT] start — ChunkRow type for inspector UI
interface ChunkRow {
  id: string;
  lesson_file_id: string | null;
  content_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
// [DEV-INSPECT] end

/** Renders a file upload button, upload error display, and a list of uploaded files with status badges. */
export function FilesTab({
    lessonId, // [DEV-INSPECT] lessonId added for chunk inspection — remove with this feature
    files,
    isUploading,
    onUploadFile,
    onDeleteFile,
}: {
    lessonId: string; // [DEV-INSPECT] remove when removing chunk inspection feature
    files: LessonFile[];
    isUploading: boolean;
    onUploadFile: (file: File) => Promise<void>;
    onDeleteFile: (fileId: string) => Promise<void>;
}) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = React.useState<string | null>(null);

    // [DEV-INSPECT] start — state for chunk inspector dialog
    const [inspectingFile, setInspectingFile] = React.useState<LessonFile | null>(null);
    const [chunks, setChunks] = React.useState<ChunkRow[]>([]);
    const [chunksLoading, setChunksLoading] = React.useState(false);
    const [inspectView, setInspectView] = React.useState<'chunks' | 'document' | 'raw_json'>('chunks');
    // [DEV-INSPECT] end

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

    // [DEV-INSPECT] start — fetch chunks for a file and open the dialog
    const handleInspect = async (file: LessonFile) => {
        setInspectingFile(file);
        setChunks([]);
        setChunksLoading(true);
        setInspectView('chunks');
        try {
            const res = await fetch(
                `/api/lessons/${lessonId}/chunks?fileId=${file.id}`
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error((body as { error?: string }).error ?? 'Failed to load chunks');
            }
            const data = await res.json() as { chunks: ChunkRow[] };
            setChunks(data.chunks);
        } catch (err) {
            setChunks([]);
            console.error(err instanceof Error ? err.message : String(err));
        } finally {
            setChunksLoading(false);
        }
    };
    // [DEV-INSPECT] end

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
                            {/* [DEV-INSPECT] start — inspect button shown only for ready files */}
                            {f.status === 'ready' && (
                                <button
                                    onClick={() => handleInspect(f)}
                                    className="shrink-0 p-1 hover:bg-blue-50 hover:text-blue-600 rounded"
                                    title="Inspect extracted chunks"
                                >
                                    <FileSearch className="h-3 w-3" />
                                </button>
                            )}
                            {/* [DEV-INSPECT] end */}
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

            {/* [DEV-INSPECT] start — chunk inspector dialog */}
            <Dialog open={inspectingFile !== null} onOpenChange={(open) => { if (!open) setInspectingFile(null); }}>
                <DialogContent className="max-w-2xl w-full">
                    <DialogHeader>
                        <DialogTitle>
                            Chunks — {inspectingFile?.fileName ?? ''}{' '}
                            {/* [DEV-INSPECT] exclude sentinel from displayed count */}
                            {!chunksLoading && `(${chunks.filter(c => !c.metadata?.dev_inspect).length} chunks)`}
                        </DialogTitle>
                    </DialogHeader>

                    {chunksLoading ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Loading chunks…</p>
                    ) : chunks.filter(c => !c.metadata?.dev_inspect).length === 0 && !chunks.find(c => c.metadata?.dev_inspect) ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No chunks found for this file.</p>
                    ) : (
                        <Tabs value={inspectView} onValueChange={(v) => setInspectView(v as 'chunks' | 'document' | 'raw_json')}>
                            {/* [DEV-INSPECT] start — separate vision_raw_json sentinel from regular chunks */}
                            {(() => {
                                const regularChunks = chunks.filter(c => !c.metadata?.dev_inspect);
                                const rawJsonChunk = chunks.find(c => c.metadata?.dev_inspect);
                                const prettyRawJson = rawJsonChunk
                                    ? (() => { try { return JSON.stringify(JSON.parse(rawJsonChunk.content), null, 2); } catch { return rawJsonChunk.content; } })()
                                    : null;
                                return (
                                    <>
                                        <TabsList>
                                            <TabsTrigger value="chunks">Per Chunk</TabsTrigger>
                                            <TabsTrigger value="document">Full Document</TabsTrigger>
                                            {rawJsonChunk && <TabsTrigger value="raw_json">Raw Vision JSON</TabsTrigger>}
                                        </TabsList>

                                        <TabsContent value="chunks">
                                            <ScrollArea className="h-[60vh] pr-2 mt-2">
                                                <div className="space-y-3">
                                                    {regularChunks.map((chunk, idx) => (
                                                        <div key={chunk.id} className="border rounded p-2 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold text-muted-foreground">
                                                                    Chunk {idx + 1}/{regularChunks.length}
                                                                </span>
                                                                <Badge className="text-xs bg-gray-100 text-gray-700">
                                                                    {chunk.content_type}
                                                                </Badge>
                                                            </div>
                                                            <hr />
                                                            <pre className="text-xs whitespace-pre-wrap font-mono break-words">
                                                                {chunk.content}
                                                            </pre>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>

                                        <TabsContent value="document">
                                            <ScrollArea className="h-[60vh] pr-2 mt-2">
                                                <pre className="text-xs whitespace-pre-wrap font-mono break-words">
                                                    {regularChunks.map((c) => c.content).join('\n\n')}
                                                </pre>
                                            </ScrollArea>
                                        </TabsContent>

                                        {rawJsonChunk && (
                                            <TabsContent value="raw_json">
                                                <ScrollArea className="h-[60vh] pr-2 mt-2">
                                                    <pre className="text-xs whitespace-pre-wrap font-mono break-words">
                                                        {prettyRawJson}
                                                    </pre>
                                                </ScrollArea>
                                            </TabsContent>
                                        )}
                                    </>
                                );
                            })()}
                            {/* [DEV-INSPECT] end */}
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>
            {/* [DEV-INSPECT] end */}
        </div>
    );
}
