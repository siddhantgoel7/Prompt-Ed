import { useState, useCallback, useEffect } from 'react';
import type { LessonFile } from '@/types/ai';
import { fetchFilesApi, uploadFileApi, deleteFileApi, getFileDownloadUrlApi } from '@/lib/api/filesApi';

export function useLessonFiles(lessonId: string) {
    const [files, setFiles] = useState<LessonFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const fetchFiles = useCallback(async () => {
        try {
            const data = await fetchFilesApi(lessonId);
            setFiles(data);
        } catch (err) {
            console.error('Failed to fetch files', err);
        }
    }, [lessonId]);

    const uploadFile = useCallback(async (file: File) => {
        setIsUploading(true);
        const tempId = `temp-${Date.now()}`;
        const optimistic: LessonFile = {
            id: tempId,
            lessonId,
            fileName: file.name,
            fileType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx',
            fileSizeBytes: file.size,
            status: 'uploading',
            uploadedAt: new Date().toISOString(),
        };
        setFiles((prev) => [optimistic, ...prev]);

        try {
            await uploadFileApi(lessonId, file);
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsUploading(false);
            setFiles((prev) => prev.filter((f) => f.id !== tempId));
            await fetchFiles();
        }
    }, [lessonId, fetchFiles]);

    const deleteFile = useCallback(async (fileId: string) => {
        try {
            await deleteFileApi(lessonId, fileId);
            await fetchFiles();
        } catch (err) {
            console.error('Failed to delete file', err);
        }
    }, [lessonId, fetchFiles]);

    const openFile = useCallback(async (fileId: string) => {
        try {
            const { url, fileName } = await getFileDownloadUrlApi(lessonId, fileId);

            const fileRes = await fetch(url);
            const blob = await fileRes.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error('Failed to open file', err);
        }
    }, [lessonId]);

    // Poll for processing files
    useEffect(() => {
        const hasProcessing = files.some(f => f.status === 'processing');
        if (!hasProcessing) return;

        const intervalId = setInterval(() => {
            void fetchFiles();
        }, 2000);

        return () => clearInterval(intervalId);
    }, [files, fetchFiles]);

    return { files, isUploading, fetchFiles, uploadFile, deleteFile, openFile };
}
