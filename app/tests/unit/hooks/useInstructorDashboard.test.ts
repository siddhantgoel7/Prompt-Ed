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

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/supabase/auth', () => ({
  signOut: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/api/courseApi', () => ({
  listInstructorCourses: jest.fn(),
  createCourse: jest.fn(),
  updateCourse: jest.fn(),
  deleteCourseCascade: jest.fn(),
}));

describe('useInstructorDashboard', () => {
    let mockRouter: any;
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRouter = { push: jest.fn(), refresh: jest.fn() };
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        mockSupabase = {
            auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) }
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [], error: null });
    });

    it('success: boots and fetches courses', async () => {
        const courses = [{ id: 'c1', title: 'Course 1' }];
        (listInstructorCourses as jest.Mock).mockResolvedValue({ data: courses, error: null });

        const { result } = renderHook(() => useInstructorDashboard());

        await waitFor(() => {
            expect(result.current.loadingUser).toBe(false);
        });

        expect(result.current.courses).toEqual(courses);
    });

    it('failure: redirects if not logged in', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
        renderHook(() => useInstructorDashboard());

        await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/');
        });
    });

    it('success: handles add course modal and submission', async () => {
        const { result } = renderHook(() => useInstructorDashboard());
        await waitFor(() => expect(result.current.loadingUser).toBe(false));

        act(() => {
            result.current.openAdd();
        });
        expect(result.current.modal.type).toBe('add');

        act(() => {
            result.current.onFormChange({ target: { name: 'title', value: 'New Course' } } as any);
        });

        (createCourse as jest.Mock).mockResolvedValue({ data: [{ id: 'c2', title: 'New Course' }], error: null });

        await act(async () => {
            await result.current.submitAdd({ preventDefault: jest.fn() } as any);
        });

        expect(createCourse).toHaveBeenCalledWith('u1', { title: 'New Course', image_url: '' });
        expect(result.current.courses).toHaveLength(1);
        expect(result.current.modal.type).toBe('none');
    });

    it('success: handles edit course modal and submission', async () => {
        const initialCourses = [{ id: 'c1', title: 'Old' }];
        (listInstructorCourses as jest.Mock).mockResolvedValue({ data: initialCourses, error: null });

        const { result } = renderHook(() => useInstructorDashboard());
        await waitFor(() => expect(result.current.loadingUser).toBe(false));

        act(() => {
            result.current.openEdit(initialCourses[0] as any);
        });
        expect(result.current.modal.type).toBe('edit');

        act(() => {
            result.current.onFormChange({ target: { name: 'title', value: 'Updated' } } as any);
        });

        (updateCourse as jest.Mock).mockResolvedValue({ data: [{ id: 'c1', title: 'Updated' }], error: null });

        await act(async () => {
            await result.current.submitEdit({ preventDefault: jest.fn() } as any);
        });

        expect(result.current.courses[0].title).toBe('Updated');
    });

    it('success: handles delete course modal and confirmation', async () => {
        const initialCourses = [{ id: 'c1', title: 'Del' }];
        (listInstructorCourses as jest.Mock).mockResolvedValue({ data: initialCourses, error: null });

        const { result } = renderHook(() => useInstructorDashboard());
        await waitFor(() => expect(result.current.loadingUser).toBe(false));

        act(() => {
            result.current.openDelete(initialCourses[0] as any);
        });

        (deleteCourseCascade as jest.Mock).mockResolvedValue({ 
            lessonsResult: { error: null }, 
            courseResult: { error: null } 
        });

        await act(async () => {
            await result.current.confirmDelete();
        });

        expect(result.current.courses).toHaveLength(0);
    });

    it('success: handles logout', async () => {
        (signOut as jest.Mock).mockResolvedValue({ error: null });
        const { result } = renderHook(() => useInstructorDashboard());

        await act(async () => {
            await result.current.logout();
        });

        expect(mockRouter.push).toHaveBeenCalledWith('/');
        expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('success: opens lessons page', async () => {
        const { result } = renderHook(() => useInstructorDashboard());
        act(() => {
            result.current.accessCourse('c1');
        });
        expect(mockRouter.push).toHaveBeenCalledWith('/lessons_page/c1');
    });
});
