import type { CandidateSet } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

export async function generateCandidatesApi(lessonId: string, promptType: PromptType, transcriptText: string): Promise<CandidateSet> {
    const res = await fetch(`/api/lessons/${lessonId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, transcriptText }),
    });
    if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Generation failed');
    }
    return res.json() as Promise<CandidateSet>;
}

export async function transcribeAudioApi(lessonId: string, audioBlob: Blob): Promise<string> {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');

    const res = await fetch(`/api/lessons/${lessonId}/transcript`, {
        method: 'POST',
        body: form,
    });

    if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Transcription failed');
    }

    const data = await res.json() as { transcript: string };
    return data.transcript;
}
