import { deleteLesson } from '@/lib/api/lessonApi';
import { createClient } from '@/lib/supabase/client';

// Mock client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

describe('lessonApi deletion', () => {
  const lessonId = 'l1';
  let mockSupabase: any;
  let mockRemove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove = jest.fn().mockResolvedValue({ error: null });
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ 
            data: [{ storage_path: 'path/1' }], 
            error: null 
          }),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ 
            data: null, 
            error: null 
          }),
        })),
      })),
      storage: {
        from: jest.fn(() => ({
          remove: mockRemove,
        })),
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('deleteLesson follows storage cleanup then db delete', async () => {
    await deleteLesson(lessonId);
    
    // Check storage cleanup
    expect(mockSupabase.from).toHaveBeenCalledWith('lesson_files');
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('lesson-files');
    expect(mockRemove).toHaveBeenCalledWith(['path/1']);
    
    // Check db delete
    expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
  });

  it('continues db delete even if storage fetch fails', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'lesson_files') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
          })),
        };
      }
      return {
        delete: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      };
    });

    await deleteLesson(lessonId);
    expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
  });
});
