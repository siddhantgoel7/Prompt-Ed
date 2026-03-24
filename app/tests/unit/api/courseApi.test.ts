import { 
  listInstructorCourses, 
  createCourse, 
  updateCourse, 
  deleteCourseCascade 
} from '@/lib/api/courseApi';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('courseApi', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    it('listInstructorCourses: calls select with correct filters', async () => {
        await listInstructorCourses('u1');
        expect(mockSupabase.from).toHaveBeenCalledWith('courses');
        expect(mockSupabase.select).toHaveBeenCalledWith('*');
        expect(mockSupabase.eq).toHaveBeenCalledWith('instructor_id', 'u1');
    });

    it('createCourse: calls insert with trimmed values', async () => {
        await createCourse('u1', { title: '  New Course  ', image_url: ' http://img ' });
        expect(mockSupabase.insert).toHaveBeenCalledWith([
            { instructor_id: 'u1', title: 'New Course', image_url: 'http://img' }
        ]);
    });

    it('updateCourse: calls update with trimmed values', async () => {
        await updateCourse('c1', { title: ' Updated ', image_url: '' });
        expect(mockSupabase.update).toHaveBeenCalledWith({ title: 'Updated', image_url: null });
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'c1');
    });

    it('deleteCourseCascade: deletes from lessons then courses', async () => {
        mockSupabase.delete.mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });
        
        await deleteCourseCascade('c1');
        
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
        expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });
});
