// Hook for loading and saving the user's AI prompt preferences (difficulty, style, length).
import { useState, useEffect } from 'react';
import { AIPromptPreferences } from '@/types/ai';

export function useAIPreferences() {
    const [preferences, setPreferences] = useState<AIPromptPreferences>({
        difficulty: 'intermediate',
        style: 'socratic',
        length: 'standard',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadPrefs() {
            try {
                const res = await fetch('/api/user/ai-preferences');
                if (!res.ok) throw new Error('Failed to load preferences');
                const data = await res.json();
                setPreferences(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        }
        loadPrefs();
    }, []);

    const savePreferences = async (newPrefs: AIPromptPreferences) => {
        try {
            const res = await fetch('/api/user/ai-preferences', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPrefs),
            });
            if (!res.ok) throw new Error('Failed to save preferences');
            setPreferences(newPrefs);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return false;
        }
    };

    return { preferences, savePreferences, isLoading, error };
}
