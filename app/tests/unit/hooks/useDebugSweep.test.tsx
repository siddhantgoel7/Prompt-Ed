import { renderHook, act } from '@testing-library/react';
import { useDebugSweep } from '@/hooks/useDebugSweep';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { generateCandidatesApi } from '@/lib/api/aiApi';

jest.mock('@/hooks/useAIPreferences', () => ({
  useAIPreferences: jest.fn(),
}));

jest.mock('@/lib/api/aiApi', () => ({
  generateCandidatesApi: jest.fn(),
}));

describe('useDebugSweep', () => {
    const defaultProps = {
        lessonId: 'l1',
        transcriptText: 'test transcript',
        candidates: [{ promptText: 'Q1', promptType: 'short_answer' as const, topicArea: 'topic', rationale: 'why' }],
        isGenerating: false,
        generationWarning: null,
        generationTimeMs: 1500,
        lastTokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        lastModel: 'gpt-4o',
        promptType: 'short_answer' as const,
    };

    const mockPreferences = {
        difficulty: 'intermediate',
        style: 'socratic',
        length: 'standard',
        focusAreas: 'none'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAIPreferences as jest.Mock).mockReturnValue({ preferences: mockPreferences });
        
        // Mock clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: jest.fn().mockResolvedValue(undefined),
            },
        });

        // Mock download functions (non-destructively for document.body)
        if (typeof window !== 'undefined') {
            window.URL.createObjectURL = jest.fn(() => 'mock-url');
            window.URL.revokeObjectURL = jest.fn();
            // Spy instead of overwrite
            jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
            jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
        }
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('success: handleCopyReport copies a formatted report to clipboard', async () => {
        jest.useFakeTimers();
        const { result } = renderHook(() => useDebugSweep(defaultProps));

        await act(async () => {
            await result.current.handleCopyReport();
        });

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(result.current.copiedReport).toBe(true);
        
        // Wait for timeout to reset copied state
        act(() => {
            jest.advanceTimersByTime(2100);
        });
        expect(result.current.copiedReport).toBe(false);
        jest.useRealTimers();
    });

    it('success: handleRunAllCombinations runs a full sweep and downloads results', async () => {
        // Mock API to return something simple
        (generateCandidatesApi as jest.Mock).mockResolvedValue({
            candidates: [{ promptText: 'Generated Q', promptType: 'short_answer', bloomsLevel: 'apply' }],
            warning: null,
            tokenUsage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
            model: 'test-model'
        });

        const { result } = renderHook(() => useDebugSweep(defaultProps));

        // Note: the sweep runs 81 combinations. We might want to mock them faster or test a smaller subset 
        // if the hook was refactored, but here we have to run them all or mock the loop.
        // Given concurrency of 9, it should finish in a few "ticks".

        await act(async () => {
             result.current.handleRunAllCombinations();
             // Since it runs 81 times with concurrency 9, we need to wait for all workers
             for(let i=0; i<20; i++) {
                 await new Promise(resolve => setTimeout(resolve, 50));
             }
        });

        expect(generateCandidatesApi).toHaveBeenCalled(); 
        expect((generateCandidatesApi as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('failure: handleRunAllCombinations continues sweep even if some API calls fail', async () => {
        (generateCandidatesApi as jest.Mock)
            .mockImplementationOnce(() => Promise.reject(new Error('Network Fail')))
            .mockResolvedValue({
                candidates: [],
                warning: 'Fallback',
                tokenUsage: null,
                model: null
            });

        const { result } = renderHook(() => useDebugSweep(defaultProps));

        await act(async () => {
            await result.current.handleRunAllCombinations();
        });

        expect(generateCandidatesApi).toHaveBeenCalledTimes(81);
        expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
    });
});
