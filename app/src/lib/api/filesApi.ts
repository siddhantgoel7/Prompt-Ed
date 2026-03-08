// Client-side API functions for managing lesson file uploads, listing, deletion, and download URLs.
import type { LessonFile } from '@/types/ai';

/** Fetches the list of uploaded files for a lesson. */
export async function fetchFilesApi(lessonId: string): Promise<LessonFile[]> {
    const res = await fetch(`/api/lessons/${lessonId}/files`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json() as Promise<LessonFile[]>;
}

/** Uploads a PDF or PPTX file for a lesson and triggers background parsing/embedding. */
export async function uploadFileApi(lessonId: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/lessons/${lessonId}/upload`, {
        method: 'POST',
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
    }
}

/** Deletes a lesson file and its associated chunks from the database and storage. */
export async function deleteFileApi(lessonId: string, fileId: string): Promise<void> {
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
}

/** Gets a short-lived signed download URL and the original filename for a lesson file. */
export async function getFileDownloadUrlApi(lessonId: string, fileId: string): Promise<{ url: string; fileName: string }> {
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`);
    if (!res.ok) throw new Error('Failed to get download URL');
    return res.json() as Promise<{ url: string; fileName: string }>;
}
