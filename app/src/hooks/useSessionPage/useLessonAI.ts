import { useState, useCallback } from 'react';
import type { GeneratedPrompt, TokenUsage } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { generateCandidatesApi } from '@/lib/api/aiApi';

export function useLessonAI(lessonId: string, setPromptInput: (p: string) => void) {
    const [transcriptText, setTranscriptText] = useState('');
    const [promptType, setPromptType] = useState<PromptType>('long_answer');
    const [candidates, setCandidates] = useState<GeneratedPrompt[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationWarning, setGenerationWarning] = useState<string | null>(null);
    const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
    const [lastTokenUsage, setLastTokenUsage] = useState<TokenUsage | null>(null);
    const [lastModel, setLastModel] = useState<string | null>(null);

    const generateCandidates = useCallback(async (transcriptOverride?: string) => {
        const transcriptToUse = transcriptOverride ?? transcriptText;
        setIsGenerating(true);
        setGenerationWarning(null);
        const startMs = Date.now();
        try {
            const data = await generateCandidatesApi(lessonId, promptType, transcriptToUse);
            setGenerationTimeMs(Date.now() - startMs);
            setLastTokenUsage(data.tokenUsage ?? null);
            setLastModel(data.model ?? null);
            setCandidates(data.candidates);
            setGenerationWarning(data.warning ?? null);
        } catch (err) {
            setGenerationTimeMs(Date.now() - startMs);
            setGenerationWarning(err instanceof Error ? err.message : 'Failed to generate prompts');
        } finally {
            setIsGenerating(false);
        }
    }, [lessonId, promptType, transcriptText]);

    const selectCandidate = useCallback((p: GeneratedPrompt) => {
        setPromptInput(p.promptText);
        setPromptType(p.promptType);
    }, [setPromptInput, setPromptType]);

    const regenerateCandidates = useCallback(async () => {
        setCandidates([]);
        await generateCandidates();
    }, [generateCandidates]);

    // Exposing a method to reset states inside the aggregator
    const clearAIState = useCallback(() => {
        setCandidates([]);
        setTranscriptText('');
        setPromptInput('');
        setGenerationTimeMs(null);
        setLastTokenUsage(null);
        setLastModel(null);
    }, [setPromptInput]);

    return {
        transcriptText,
        setTranscriptText,
        promptType,
        setPromptType,
        candidates,
        isGenerating,
        generationWarning,
        generationTimeMs,
        lastTokenUsage,
        lastModel,
        generateCandidates,
        selectCandidate,
        regenerateCandidates,
        clearAIState
    };
}
