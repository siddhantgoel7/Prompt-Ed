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
    // [DEBUG] track wall-clock generation time, token usage, and model for copy report
    const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
    const [lastTokenUsage, setLastTokenUsage] = useState<TokenUsage | null>(null);
    const [lastModel, setLastModel] = useState<string | null>(null);
    // [END DEBUG]

    const generateCandidates = useCallback(async (transcriptOverride?: string) => {
        const transcriptToUse = transcriptOverride ?? transcriptText;
        setIsGenerating(true);
        setGenerationWarning(null);
        // [DEBUG] start timing before API call
        const startMs = Date.now();
        // [END DEBUG]
        try {
            const data = await generateCandidatesApi(lessonId, promptType, transcriptToUse);
            // [DEBUG] record elapsed time, token usage, and model on success
            setGenerationTimeMs(Date.now() - startMs);
            setLastTokenUsage(data.tokenUsage ?? null);
            setLastModel(data.model ?? null);
            // [END DEBUG]
            setCandidates(data.candidates);
            setGenerationWarning(data.warning ?? null);
        } catch (err) {
            // [DEBUG] record elapsed time on failure too
            setGenerationTimeMs(Date.now() - startMs);
            // [END DEBUG]
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
        // [DEBUG] reset timing, token usage, and model on clear
        setGenerationTimeMs(null);
        setLastTokenUsage(null);
        setLastModel(null);
        // [END DEBUG]
    }, [setPromptInput]);

    return {
        transcriptText,
        setTranscriptText,
        promptType,
        setPromptType,
        candidates,
        isGenerating,
        generationWarning,
        // [DEBUG] expose timing, token usage, and model for copy report
        generationTimeMs,
        lastTokenUsage,
        lastModel,
        // [END DEBUG]
        generateCandidates,
        selectCandidate,
        regenerateCandidates,
        clearAIState
    };
}
