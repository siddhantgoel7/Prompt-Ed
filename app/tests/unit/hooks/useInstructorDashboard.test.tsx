import { renderHook, act } from '@testing-library/react';
import { useInstructorDashboard } from '@/hooks/useInstructorDashboard';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';
import { 
  listInstructorCourses, 
  createCourse, 
  updateCourse, 
  deleteCourseCascade 
} from '@/lib/api/courseApi';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/auth', () => ({
  signOut: jest.fn(),
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
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
            },
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
        (listInstructorCourses as jest.Mock).mockResolvedValue({ data: [{ id: 'c1', title: 'Course 1' }], error: null });
    });

    it('success: initializes and fetches courses', async () => {
        const { result } = renderHook(() => useInstructorDashboard());

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.loadingUser).toBe(false);
        expect(result.current.courses).toHaveLength(1);
        expect(listInstructorCourses).toHaveBeenCalledWith('u1');
    });

    it('success: handles add course flow', async () => {
        const { result } = renderHook(() => useInstructorDashboard());
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

        act(() => { result.current.openAdd(); });
        expect(result.current.modal.type).toBe('add');

        act(() => {
            result.current.onFormChange({ target: { name: 'title', value: 'New Course' } } as any);
        });

        (createCourse as jest.Mock).mockResolvedValue({ data: [{ id: 'c2', title: 'New Course' }], error: null });

        await act(async () => {
            await result.current.submitAdd({ preventDefault: jest.fn() } as any);
        });

        expect(createCourse).toHaveBeenCalled();
        expect(result.current.courses).toHaveLength(2);
        expect(result.current.modal.type).toBe('none');
    });

    it('success: handles logout', async () => {
        (signOut as jest.Mock).mockResolvedValue({ error: null });
        const { result } = renderHook(() => useInstructorDashboard());
        
        await act(async () => {
            await result.current.logout();
        });

        expect(signOut).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('success: handles delete flow', async () => {
        const { result } = renderHook(() => useInstructorDashboard());
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

        act(() => { result.current.openDelete({ id: 'c1', title: 'Course 1' } as any); });
        
        (deleteCourseCascade as jest.Mock).mockResolvedValue({ 
            lessonsResult: { data: [], error: null }, 
            courseResult: { data: [], error: null } 
        });

        await act(async () => {
            await result.current.confirmDelete();
        });

        expect(deleteCourseCascade).toHaveBeenCalledWith('c1');
        expect(result.current.courses).toHaveLength(0);
    });
});
