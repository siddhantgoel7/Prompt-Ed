import { renderHook, waitFor, act } from '@testing-library/react';
import { useAIPreferences } from '@/hooks/useAIPreferences';

describe('useAIPreferences Hook [US 1.22]', () => {
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock;
        jest.clearAllMocks();
    });

    // 53.1
    it('[US 1.22][UNIT1] success: loads preferences from API on mount', async () => {
        const mockPrefs = {
            difficulty: 'advanced',
            style: 'factual',
            length: 'brief',
            focusAreas: 'test',
        };

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => mockPrefs,
        });

        const { result } = renderHook(() => useAIPreferences());

        // Initially loading
        expect(result.current.isLoading).toBe(true);

        // Wait for fetch to complete
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(fetchMock).toHaveBeenCalledWith('/api/user/ai-preferences');
        expect(result.current.preferences).toEqual(mockPrefs);
        expect(result.current.error).toBeNull();
    });

    // 53.2
    it('[US 1.22][UNIT2] failure: handles fetch error gracefully', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
        });

        const { result } = renderHook(() => useAIPreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe('Failed to load preferences');
        // Will fallback to initial defaults
        expect(result.current.preferences.difficulty).toBe('intermediate');
    });

    // 53.3
    it('[US 1.22][UNIT3] success: saves new preferences via API', async () => {
        const initialPrefs = {
            difficulty: 'intermediate',
            style: 'socratic',
            length: 'standard',
        };

        const newPrefs = {
            difficulty: 'advanced' as const,
            style: 'factual' as const,
            length: 'brief' as const,
            focusAreas: 'pharmacology',
        };

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => initialPrefs,
        });

        const { result } = renderHook(() => useAIPreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Setup mock for the PUT request
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });

        let saveSuccess;
        await act(async () => {
            saveSuccess = await result.current.savePreferences(newPrefs);
        });

        expect(saveSuccess).toBe(true);
        expect(result.current.preferences).toEqual(newPrefs);
        expect(fetchMock).toHaveBeenCalledWith('/api/user/ai-preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPrefs),
        });
    });

    // 53.4
    it('[US 1.22][UNIT4] failure: handles error when saving preferences fails', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ difficulty: 'intermediate' }),
        });

        const { result } = renderHook(() => useAIPreferences());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        fetchMock.mockResolvedValueOnce({
            ok: false,
        });

        let saveSuccess;
        await act(async () => {
            saveSuccess = await result.current.savePreferences({
                difficulty: 'advanced',
                style: 'factual',
                length: 'brief',
            });
        });

        expect(saveSuccess).toBe(false);
        expect(result.current.error).toBe('Failed to save preferences');
    });
});
