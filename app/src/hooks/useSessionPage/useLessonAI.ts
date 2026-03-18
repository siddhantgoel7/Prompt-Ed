import { useState, useCallback } from 'react';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { generateCandidatesApi } from '@/lib/api/aiApi';

export function useLessonAI(lessonId: string, setPromptInput: (p: string) => void) {
    const [transcriptText, setTranscriptText] = useState('');
    const [promptType, setPromptType] = useState<PromptType>('long_answer');
    const [candidates, setCandidates] = useState<GeneratedPrompt[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationWarning, setGenerationWarning] = useState<string | null>(null);

    const generateCandidates = useCallback(async (transcriptOverride?: string) => {
        const transcriptToUse = transcriptOverride ?? transcriptText;
        setIsGenerating(true);
        setGenerationWarning(null);
        try {
            const data = await generateCandidatesApi(lessonId, promptType, transcriptToUse);
            setCandidates(data.candidates);
            setGenerationWarning(data.warning ?? null);
        } catch (err) {
            setGenerationWarning(err instanceof Error ? err.message : 'Failed to generate prompts');
        } finally {
            setIsGenerating(false);
        }
    }, [lessonId, promptType, transcriptText]);

    const selectCandidate = useCallback((p: GeneratedPrompt) => {
        setPromptInput(p.promptText);
        setPromptType(p.promptType);
    }, [setPromptInput]);

    const regenerateCandidates = useCallback(async () => {
        setCandidates([]);
        await generateCandidates();
    }, [generateCandidates]);

    // Exposing a method to reset states inside the aggregator
    const clearAIState = useCallback(() => {
        setCandidates([]);
        setTranscriptText('');
        setPromptInput('');
    }, [setPromptInput]);

    return {
        transcriptText,
        setTranscriptText,
        promptType,
        setPromptType,
        candidates,
        isGenerating,
        generationWarning,
        generateCandidates,
        selectCandidate,
        regenerateCandidates,
        clearAIState
    };
}
