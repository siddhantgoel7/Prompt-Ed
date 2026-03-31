/**
 * Tests for useLessonGeneralQuestions hook.
 * Covers fetch, generate (success + error), and warning propagation.
 */
import { renderHook, act } from '@testing-library/react';
import { useLessonGeneralQuestions } from '@/hooks/useSessionPage/useLessonGeneralQuestions';
import { fetchGeneralQuestionsApi, generateGeneralQuestionsApi } from '@/lib/api/aiApi';

jest.mock('@/lib/api/aiApi', () => ({
  fetchGeneralQuestionsApi: jest.fn(),
  generateGeneralQuestionsApi: jest.fn(),
}));

const mockQuestions = [
  { id: 'q1', prompt_text: 'What is pharmacokinetics?', mc_options: [], correct_option: 'A', display_order: 0, lesson_id: 'l1' },
];

describe('useLessonGeneralQuestions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initialises with empty state', () => {
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    expect(result.current.generalQuestions).toEqual([]);
    expect(result.current.isGeneratingGeneral).toBe(false);
    expect(result.current.generalWarning).toBeNull();
  });

  it('fetchGeneralQuestions populates questions on success', async () => {
    (fetchGeneralQuestionsApi as jest.Mock).mockResolvedValue(mockQuestions);
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    await act(async () => { await result.current.fetchGeneralQuestions(); });
    expect(result.current.generalQuestions).toEqual(mockQuestions);
  });

  it('fetchGeneralQuestions does not crash on error', async () => {
    (fetchGeneralQuestionsApi as jest.Mock).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    await act(async () => { await result.current.fetchGeneralQuestions(); });
    // Should remain empty — no crash
    expect(result.current.generalQuestions).toEqual([]);
  });

  it('generateGeneralQuestions sets questions and clears warning on success', async () => {
    (generateGeneralQuestionsApi as jest.Mock).mockResolvedValue({ questions: mockQuestions, warning: undefined });
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    await act(async () => { await result.current.generateGeneralQuestions(); });
    expect(result.current.generalQuestions).toEqual(mockQuestions);
    expect(result.current.generalWarning).toBeNull();
    expect(result.current.isGeneratingGeneral).toBe(false);
  });

  it('generateGeneralQuestions propagates warning from API', async () => {
    (generateGeneralQuestionsApi as jest.Mock).mockResolvedValue({ questions: mockQuestions, warning: 'Mock mode active' });
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    await act(async () => { await result.current.generateGeneralQuestions(); });
    expect(result.current.generalWarning).toBe('Mock mode active');
  });

  it('generateGeneralQuestions sets warning on Error failure', async () => {
    (generateGeneralQuestionsApi as jest.Mock).mockRejectedValue(new Error('Generation failed'));
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    await act(async () => { await result.current.generateGeneralQuestions(); });
    expect(result.current.generalWarning).toBe('Generation failed');
    expect(result.current.isGeneratingGeneral).toBe(false);
  });

  it('generateGeneralQuestions sets fallback warning on non-Error failure', async () => {
    (generateGeneralQuestionsApi as jest.Mock).mockRejectedValue('string error');
    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    await act(async () => { await result.current.generateGeneralQuestions(); });
    expect(result.current.generalWarning).toBe('Failed to generate general questions');
  });

  it('isGeneratingGeneral is true during generation', async () => {
    let resolve: (v: any) => void;
    const promise = new Promise((r) => { resolve = r; });
    (generateGeneralQuestionsApi as jest.Mock).mockReturnValue(promise);

    const { result } = renderHook(() => useLessonGeneralQuestions('l1'));
    act(() => { result.current.generateGeneralQuestions(); });
    expect(result.current.isGeneratingGeneral).toBe(true);

    await act(async () => { resolve!({ questions: [], warning: undefined }); await promise; });
    expect(result.current.isGeneratingGeneral).toBe(false);
  });
});
