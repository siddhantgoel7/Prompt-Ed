import { renderHook, act } from '@testing-library/react';
import { useLessonAI } from '@/hooks/useSessionPage/useLessonAI';
import { generateCandidatesApi } from '@/lib/api/aiApi';

jest.mock('@/lib/api/aiApi', () => ({
    generateCandidatesApi: jest.fn(),
}));

describe('useLessonAI', () => {
    const lessonId = 'l1';
    const setPromptInput = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('success: generates candidates', async () => {
        (generateCandidatesApi as jest.Mock).mockResolvedValue({
            candidates: [{ id: 'c1', promptText: 'Q1', promptType: 'long_answer' }],
            tokenUsage: { total: 100 },
            model: 'gpt-4o',
            warning: 'Slow generation'
        });

        const { result } = renderHook(() => useLessonAI(lessonId, setPromptInput));
        
        await act(async () => {
            await result.current.generateCandidates('test transcript');
        });

        expect(generateCandidatesApi).toHaveBeenCalledWith(lessonId, 'long_answer', 'test transcript');
        expect(result.current.candidates).toHaveLength(1);
        expect(result.current.lastModel).toBe('gpt-4o');
        expect(result.current.generationWarning).toBe('Slow generation');
        expect(result.current.generationTimeMs).not.toBeNull();
    });

    it('failure: handles generation error', async () => {
        (generateCandidatesApi as jest.Mock).mockRejectedValue(new Error('AI failed'));

        const { result } = renderHook(() => useLessonAI(lessonId, setPromptInput));

        await act(async () => {
            await result.current.generateCandidates();
        });

        expect(result.current.generationWarning).toBe('AI failed');
        expect(result.current.isGenerating).toBe(false);
    });

    it('success: selects a candidate', () => {
        const { result } = renderHook(() => useLessonAI(lessonId, setPromptInput));
        const candidate = { id: 'c1', promptText: 'Selected prompt', promptType: 'mc' } as any;

        act(() => {
            result.current.selectCandidate(candidate);
        });

        expect(setPromptInput).toHaveBeenCalledWith('Selected prompt');
        expect(result.current.promptType).toBe('mc');
    });

    it('success: regenerates and clears state', async () => {
        (generateCandidatesApi as jest.Mock).mockResolvedValue({ candidates: [] });
        const { result } = renderHook(() => useLessonAI(lessonId, setPromptInput));
        
        await act(async () => {
            await result.current.regenerateCandidates();
        });
        
        expect(result.current.candidates).toHaveLength(0);
        expect(generateCandidatesApi).toHaveBeenCalled();

        act(() => {
            result.current.clearAIState();
        });
        expect(result.current.candidates).toHaveLength(0);
        expect(result.current.transcriptText).toBe('');
    });
});
