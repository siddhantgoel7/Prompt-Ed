import { renderHook, act } from '@testing-library/react';
import { useHomeJoin } from '@/hooks/useHomeJoin';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchLessonByPinApi } from '@/lib/api/lessonApi';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/api/lessonApi', () => ({
  fetchLessonByPinApi: jest.fn(),
}));

describe('useHomeJoin', () => {
  let mockRouter: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    mockSupabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('success: initializes and redirects logged-in instructors', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    
    await act(async () => {
        renderHook(() => useHomeJoin());
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/instructor_dashboard');
  });

  it('success: allows PIN entry and navigation for active sessions', async () => {
    const { result } = renderHook(() => useHomeJoin());
    
    act(() => {
      result.current.onChangeCode('123456');
    });
    expect(result.current.code).toBe('123456');
    expect(result.current.pinOk).toBe(true);

    (fetchLessonByPinApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'active' }, error: null });

    await act(async () => {
      await result.current.join();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/student/l1');
  });

  it('failure: shows error for invalid PIN during join', async () => {
    const { result } = renderHook(() => useHomeJoin());
    
    act(() => { result.current.onChangeCode('000000'); });
    (fetchLessonByPinApi as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Not found' } });

    await act(async () => {
      await result.current.join();
    });

    expect(result.current.error).toBe('Invalid PIN. Please try again.');
    expect(result.current.view).toBe('ready');
  });

  it('failure: shows error when lesson is not active', async () => {
    const { result } = renderHook(() => useHomeJoin());
    act(() => { result.current.onChangeCode('111111'); });
    (fetchLessonByPinApi as jest.Mock).mockResolvedValue({ data: { id: 'l1', status: 'ended' }, error: null });

    await act(async () => {
      await result.current.join();
    });

    expect(result.current.error).toBe('This lesson has ended.');
  });
});
