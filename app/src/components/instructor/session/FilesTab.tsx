// Tab content panel for managing lesson file uploads (PDF/PPTX) in the active session sidebar.
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { LessonFile, UploadStatus } from '@/types/ai';

/** Renders a file upload button, upload error display, and a list of uploaded files with status badges. */
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
                return <Badge className="text-xs" style={{ background: 'var(--color-primary-alpha-15)', color: 'var(--color-primary-500)', border: 'none' }}>Ready</Badge>;
            case 'processing':
            case 'uploading':
                return <Badge className="text-xs" style={{ background: 'var(--color-warning-alpha-15)', color: 'var(--color-warning-600)', border: 'none' }}>Processing</Badge>;
            case 'failed':
                return <Badge className="text-xs" style={{ background: 'var(--color-error-alpha-12)', color: 'var(--recording-text, #dc2626)', border: 'none' }}>Failed</Badge>;
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
                className="w-full px-3 py-2 text-sm font-semibold text-white rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed btn-primary-glow transition-all duration-150"
                style={{ background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))' }}
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
                        <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-raised border border-line-subtle">
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
                                className="shrink-0 p-1 rounded disabled:opacity-50 transition-colors duration-150 text-content-muted"
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--recording-text, #dc2626)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-error-alpha-08)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                                title="Delete file"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2">
                        Ready: available for AI generation. Processing: being indexed. Failed: delete and re-upload.
                    </p>
                </div>
            )}
        </div>
    );
}
