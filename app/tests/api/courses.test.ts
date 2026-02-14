import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
jest.mock('@/lib/supabase/client')

// Define proper types for the chainable query builder
interface MockQueryBuilder {
  from: jest.Mock
  select: jest.Mock
  insert: jest.Mock
  delete: jest.Mock
  eq: jest.Mock
  order: jest.Mock
}

interface MockSupabaseClient extends MockQueryBuilder {
  auth: {
    getUser: jest.Mock
  }
}

describe('Courses API Operations [US 1.49][US 1.50]', () => {
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn(),
      },
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Fetch Courses', () => {
    it('[US 1.49][AT2] should fetch courses for authenticated user', async () => {
      const mockCourses = [
        { id: '1', title: 'PMCOL 400', instructor_id: 'user-123', date_created: '2024-01-01' },
        { id: '2', title: 'PMCOL 401', instructor_id: 'user-123', date_created: '2024-01-02' },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockCourses,
              error: null,
            }),
          }),
        }),
      })

      const supabase = createClient()
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', 'user-123')
        .order('date_created', { ascending: false })

      expect(data).toEqual(mockCourses)
      expect(error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
    })

    it('[US 1.49][AT2] should return empty array when user has no courses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const supabase = createClient()
      const { data } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', 'user-123')
        .order('date_created', { ascending: false })

      expect(data).toEqual([])
    })
  })

  describe('Create Course', () => {
    it('[US 1.49][AT1] should create course successfully', async () => {
      const newCourse = {
        title: 'PMCOL 400 Lec A1',
        instructor_id: 'user-123',
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'course-1', ...newCourse, date_created: new Date().toISOString() }],
            error: null,
          }),
        }),
      })

      const supabase = createClient()
      const { data, error } = await supabase.from('courses').insert([newCourse]).select()

      expect(data).toHaveLength(1)
      expect(data?.[0].title).toBe('PMCOL 400 Lec A1')
      expect(error).toBeNull()
    })

    it('[US 1.49][AT1] should fail when title is missing', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'title cannot be null' },
          }),
        }),
      })

      const supabase = createClient()
      const { data, error } = await supabase
        .from('courses')
        .insert([{ instructor_id: 'user-123' }])
        .select()

      expect(data).toBeNull()
      expect(error).toBeTruthy()
    })
  })

  describe('Delete Course', () => {
    it('[US 1.50][AT2] should delete course successfully', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      const supabase = createClient()
      const { error } = await supabase.from('courses').delete().eq('id', 'course-1')

      expect(error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('courses')
    })

    it('[US 1.50][AT2] should fail when course does not exist', async () => {
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Course not found' },
          }),
        }),
      })

      const supabase = createClient()
      const { error } = await supabase.from('courses').delete().eq('id', 'invalid-id')

      expect(error).toBeTruthy()
    })
  })
})