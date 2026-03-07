import type { LessonFile } from '@/types/ai';

export async function fetchFilesApi(lessonId: string): Promise<LessonFile[]> {
    const res = await fetch(`/api/lessons/${lessonId}/files`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json() as Promise<LessonFile[]>;
}

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

export async function deleteFileApi(lessonId: string, fileId: string): Promise<void> {
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
}

export async function getFileDownloadUrlApi(lessonId: string, fileId: string): Promise<{ url: string; fileName: string }> {
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`);
    if (!res.ok) throw new Error('Failed to get download URL');
    return res.json() as Promise<{ url: string; fileName: string }>;
}
