import { useState, useCallback, useEffect } from 'react';
import type { GeneratedPrompt, TokenUsage } from '@/types/ai';
import type { PromptType } from '@/types/discussion';
import { generateCandidatesApi } from '@/lib/api/aiApi';

export function useLessonAI(lessonId: string, setPromptInput: (p: string) => void) {
    const aiDraftKey = `lesson:${lessonId}:ai-draft`;

    const [transcriptText, setTranscriptText] = useState('');
    const [promptType, setPromptType] = useState<PromptType>('long_answer');
    const [candidates, setCandidates] = useState<GeneratedPrompt[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationWarning, setGenerationWarning] = useState<string | null>(null);
    const [generationTimeMs, setGenerationTimeMs] = useState<number | null>(null);
    const [lastTokenUsage, setLastTokenUsage] = useState<TokenUsage | null>(null);
    const [lastModel, setLastModel] = useState<string | null>(null);

    // Hydrate state from localStorage on mount
    useEffect(() => {
        const raw = localStorage.getItem(aiDraftKey);
        if (!raw) return;
        try {
            const data = JSON.parse(raw) as {
                transcriptText?: string;
                promptType?: PromptType;
                candidates?: GeneratedPrompt[];
            };
            if (data.transcriptText) setTranscriptText(data.transcriptText);
            if (data.promptType) setPromptType(data.promptType);
            if (data.candidates) setCandidates(data.candidates);
        } catch (err) {
            console.error('Failed to parse AI draft from localStorage:', err);
        }
    }, [aiDraftKey]);

    // Persist state to localStorage whenever it changes
    useEffect(() => {
        const data = {
            transcriptText,
            promptType,
            candidates,
        };
        localStorage.setItem(aiDraftKey, JSON.stringify(data));
    }, [aiDraftKey, transcriptText, promptType, candidates]);

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
        localStorage.removeItem(aiDraftKey);
    }, [aiDraftKey, setPromptInput]);

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
