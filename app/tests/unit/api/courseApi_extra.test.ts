/**
 * Extra branch coverage for courseApi.
 * Targets the image_url ternary branches not covered by the main test:
 *   - createCourse with empty image_url → null branch (line 23)
 *   - updateCourse with non-empty image_url → truthy branch (lines 33-34)
 */
import { createCourse, updateCourse } from '@/lib/api/courseApi';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({ createClient: jest.fn() }));

describe('courseApi (extra branches)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('createCourse: passes null for image_url when empty string is provided', async () => {
    await createCourse('u1', { title: 'Course', image_url: '' });
    expect(mockSupabase.insert).toHaveBeenCalledWith([
      { instructor_id: 'u1', title: 'Course', image_url: null },
    ]);
  });

  it('createCourse: passes null for image_url when only whitespace is provided', async () => {
    await createCourse('u1', { title: 'Course', image_url: '   ' });
    expect(mockSupabase.insert).toHaveBeenCalledWith([
      { instructor_id: 'u1', title: 'Course', image_url: null },
    ]);
  });

  it('updateCourse: passes trimmed image_url when non-empty string is provided', async () => {
    await updateCourse('c1', { title: 'Course', image_url: '  https://img.example.com  ' });
    expect(mockSupabase.update).toHaveBeenCalledWith({
      title: 'Course',
      image_url: 'https://img.example.com',
    });
  });
});
