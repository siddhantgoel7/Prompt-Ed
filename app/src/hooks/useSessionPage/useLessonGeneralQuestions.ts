import { useState, useCallback } from 'react';
import type { GeneralQuestion } from '@/types/ai';
import { generateGeneralQuestionsApi, fetchGeneralQuestionsApi } from '@/lib/api/aiApi';

export function useLessonGeneralQuestions(lessonId: string) {
    const [generalQuestions, setGeneralQuestions] = useState<GeneralQuestion[]>([]);
    const [isGeneratingGeneral, setIsGeneratingGeneral] = useState(false);
    const [generalWarning, setGeneralWarning] = useState<string | null>(null);

    const fetchGeneralQuestions = useCallback(async () => {
        try {
            const questions = await fetchGeneralQuestionsApi(lessonId);
            setGeneralQuestions(questions);
        } catch (err) {
            console.error('Failed to fetch general questions:', err);
        }
    }, [lessonId]);

    const generateGeneralQuestions = useCallback(async () => {
        setIsGeneratingGeneral(true);
        setGeneralWarning(null);
        try {
            const result = await generateGeneralQuestionsApi(lessonId);
            setGeneralQuestions(result.questions);
            setGeneralWarning(result.warning ?? null);
        } catch (err) {
            setGeneralWarning(err instanceof Error ? err.message : 'Failed to generate general questions');
        } finally {
            setIsGeneratingGeneral(false);
        }
    }, [lessonId]);

    return {
        generalQuestions,
        isGeneratingGeneral,
        generalWarning,
        fetchGeneralQuestions,
        generateGeneralQuestions,
    };
}
