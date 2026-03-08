'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { LessonFile, UploadStatus } from '@/types/ai';

export function FilesTab({
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
