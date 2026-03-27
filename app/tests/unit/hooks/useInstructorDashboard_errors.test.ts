/**
 * Additional branch coverage for useInstructorDashboard hook.
 * Targets error paths and edge cases not covered by the main test:
 *   - refreshCourses API error (line 47-49)
 *   - logout signOut error (lines 122-124)
 *   - submitAdd validation error (lines 146-147)
 *   - submitAdd API error (lines 154-157)
 *   - submitEdit validation error (lines 178-179)
 *   - submitEdit API error (lines 186-189)
 *   - submitEdit modal.type !== 'edit' guard (line 172)
 *   - confirmDelete courseResult error (lines 215-218)
 *   - confirmDelete lessonsResult error logging (line 212)
 *   - submitAdd returns no data (data?.[0] falsy)
 *   - submitEdit returns no data (data?.[0] falsy)
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInstructorDashboard } from '@/hooks/useInstructorDashboard';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import {
  listInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourseCascade,
} from '@/lib/api/courseApi';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/lib/supabase/auth', () => ({ signOut: jest.fn() }));
jest.mock('@/lib/supabase/client', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/api/courseApi', () => ({
  listInstructorCourses: jest.fn(),
  createCourse: jest.fn(),
  updateCourse: jest.fn(),
  deleteCourseCascade: jest.fn(),
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

let mockRouter: any;
let mockSupabase: any;

beforeEach(() => {
  jest.clearAllMocks();
  mockRouter = { push: jest.fn(), refresh: jest.fn() };
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  mockSupabase = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
  };
  (createClient as jest.Mock).mockReturnValue(mockSupabase);
  (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [], error: null });
});

async function boot() {
  const hook = renderHook(() => useInstructorDashboard());
  await waitFor(() => expect(hook.result.current.loadingUser).toBe(false));
  return hook.result;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useInstructorDashboard (error branches)', () => {
  it('sets error message when refreshCourses API returns an error', async () => {
    (listInstructorCourses as jest.Mock).mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useInstructorDashboard());
    await waitFor(() => expect(result.current.loadingUser).toBe(false));
    expect(result.current.error).toMatch(/Failed to load/i);
    consoleSpy.mockRestore();
  });

  it('keeps loggingOut=false and does not navigate when signOut returns an error', async () => {
    (signOut as jest.Mock).mockResolvedValue({ error: { message: 'Auth error' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await boot();

    await act(async () => { await result.current.logout(); });

    expect(result.current.loggingOut).toBe(false);
    expect(mockRouter.push).not.toHaveBeenCalledWith('/');
    consoleSpy.mockRestore();
  });

  it('sets validation error when submitAdd is called with empty title', async () => {
    const result = await boot();
    act(() => { result.current.openAdd(); });

    await act(async () => {
      await result.current.submitAdd({ preventDefault: jest.fn() } as any);
    });

    expect(result.current.error).toBe('Course title is required');
    expect(createCourse).not.toHaveBeenCalled();
  });

  it('sets error and stops saving when createCourse returns an error', async () => {
    (createCourse as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await boot();

    act(() => { result.current.openAdd(); });
    act(() => {
      result.current.onFormChange({ target: { name: 'title', value: 'My Course' } } as any);
    });
    await act(async () => {
      await result.current.submitAdd({ preventDefault: jest.fn() } as any);
    });

    expect(result.current.error).toMatch(/Failed to add/i);
    expect(result.current.saving).toBe(false);
    consoleSpy.mockRestore();
  });

  it('does not add to courses list when createCourse returns empty data array', async () => {
    (createCourse as jest.Mock).mockResolvedValue({ data: [], error: null });
    const result = await boot();

    act(() => { result.current.openAdd(); });
    act(() => {
      result.current.onFormChange({ target: { name: 'title', value: 'New' } } as any);
    });
    await act(async () => {
      await result.current.submitAdd({ preventDefault: jest.fn() } as any);
    });

    expect(result.current.courses).toHaveLength(0);
  });

  it('sets validation error when submitEdit is called with empty title', async () => {
    const course = { id: 'c1', title: 'Old' };
    (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [course], error: null });
    const result = await boot();

    act(() => { result.current.openEdit(course as any); });
    // Clear the title
    act(() => {
      result.current.onFormChange({ target: { name: 'title', value: '' } } as any);
    });
    await act(async () => {
      await result.current.submitEdit({ preventDefault: jest.fn() } as any);
    });

    expect(result.current.error).toBe('Course title is required');
    expect(updateCourse).not.toHaveBeenCalled();
  });

  it('sets error and stops saving when updateCourse returns an error', async () => {
    const course = { id: 'c1', title: 'Old' };
    (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [course], error: null });
    (updateCourse as jest.Mock).mockResolvedValue({ data: null, error: { message: 'Update failed' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await boot();

    act(() => { result.current.openEdit(course as any); });
    act(() => {
      result.current.onFormChange({ target: { name: 'title', value: 'New Name' } } as any);
    });
    await act(async () => {
      await result.current.submitEdit({ preventDefault: jest.fn() } as any);
    });

    expect(result.current.error).toMatch(/Failed to update/i);
    expect(result.current.saving).toBe(false);
    consoleSpy.mockRestore();
  });

  it('does not update courses list when updateCourse returns empty data', async () => {
    const course = { id: 'c1', title: 'Old', image_url: '' };
    (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [course], error: null });
    (updateCourse as jest.Mock).mockResolvedValue({ data: [], error: null });
    const result = await boot();

    act(() => { result.current.openEdit(course as any); });
    act(() => {
      result.current.onFormChange({ target: { name: 'title', value: 'New' } } as any);
    });
    await act(async () => {
      await result.current.submitEdit({ preventDefault: jest.fn() } as any);
    });

    // Course stays unchanged in list since data[0] is falsy
    expect(result.current.courses[0].title).toBe('Old');
  });

  it('does nothing when submitEdit is called with modal.type !== "edit"', async () => {
    const result = await boot();
    // modal starts as 'none' — calling submitEdit should return early
    await act(async () => {
      await result.current.submitEdit({ preventDefault: jest.fn() } as any);
    });
    expect(updateCourse).not.toHaveBeenCalled();
  });

  it('sets error and stops deleting when courseResult.error is set', async () => {
    const course = { id: 'c1', title: 'Del' };
    (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [course], error: null });
    (deleteCourseCascade as jest.Mock).mockResolvedValue({
      courseResult: { error: { message: 'FK violation' } },
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await boot();

    act(() => { result.current.openDelete(course as any); });
    await act(async () => { await result.current.confirmDelete(); });

    expect(result.current.error).toMatch(/Failed to delete/i);
    expect(result.current.deleting).toBe(false);
    expect(result.current.courses).toHaveLength(1); // not removed
    consoleSpy.mockRestore();
  });

  it('does nothing when confirmDelete is called with modal.type !== "delete"', async () => {
    const result = await boot();
    // modal.type is 'none' by default
    await act(async () => { await result.current.confirmDelete(); });
    expect(deleteCourseCascade).not.toHaveBeenCalled();
  });
});
