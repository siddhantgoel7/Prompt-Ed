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
        // updateCourse now fetches existing course first, then updates
        let fromCallCount = 0;
        mockSupabase.from.mockImplementation(() => {
            fromCallCount++;
            if (fromCallCount === 1) {
                // First call: fetch existing course image_url
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { image_url: null }, error: null })
                        })
                    })
                };
            }
            // Second call: the actual update
            return {
                update: jest.fn((payload: any) => {
                    mockSupabase._updatePayload = payload;
                    return {
                        eq: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({ data: [], error: null })
                        })
                    };
                })
            };
        });
        await updateCourse('c1', { title: ' Updated ', image_url: '' });
        expect(mockSupabase._updatePayload).toEqual({ title: 'Updated', image_url: null });
    });

    it('deleteCourseCascade: handles storage and deletes the course', async () => {
        const mockRemove = jest.fn().mockResolvedValue({ error: null });
        mockSupabase.storage = {
            from: jest.fn().mockReturnValue({
                remove: mockRemove
            })
        };

        // Track calls to from() to return different chains
        let fromCallCount = 0;
        mockSupabase.from.mockImplementation((table: string) => {
            fromCallCount++;
            if (table === 'courses' && fromCallCount === 1) {
                // First call: fetch course image_url
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: { image_url: 'https://storage.example.com/course-images/abc.jpg' }, error: null })
                        })
                    })
                };
            }
            if (table === 'lesson_files') {
                // Second call: fetch lesson file paths
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ data: [{ storage_path: 'path/1' }], error: null })
                    })
                };
            }
            // Final call: delete the course
            return {
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                })
            };
        });

        await deleteCourseCascade('c1');

        // Verifies storage cleanup attempted for lesson files and course image
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('lesson-files');
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('course-images');
        expect(mockRemove).toHaveBeenCalledWith(['path/1']);
        expect(mockRemove).toHaveBeenCalledWith(['abc.jpg']);
    });
});
