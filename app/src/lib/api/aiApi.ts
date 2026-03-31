import type { CandidateSet, GeneralQuestion, AIPromptPreferences } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

export async function generateCandidatesApi(lessonId: string, promptType: PromptType, transcriptText: string, preferencesOverride?: AIPromptPreferences): Promise<CandidateSet> {
    const res = await fetch(`/api/lessons/${lessonId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, transcriptText, preferencesOverride }),
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

export async function generateGeneralQuestionsApi(lessonId: string): Promise<{ questions: GeneralQuestion[]; warning?: string }> {
    const res = await fetch(`/api/lessons/${lessonId}/generate-general`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to generate general questions');
    }
    return res.json() as Promise<{ questions: GeneralQuestion[]; warning?: string }>;
}

export async function fetchGeneralQuestionsApi(lessonId: string): Promise<GeneralQuestion[]> {
    const res = await fetch(`/api/lessons/${lessonId}/general-questions`);
    if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to fetch general questions');
    }
    const data = await res.json() as { questions: GeneralQuestion[] };
    return data.questions;
}
