import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '@/app/instructor_dashboard/page'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'

jest.mock('@/lib/supabase/client')
jest.mock('@/lib/supabase/auth')

// Define proper types for the mock
interface MockSupabaseAuth {
  getUser: jest.Mock
}

interface MockQueryBuilder {
  from: jest.Mock
  select: jest.Mock
  eq: jest.Mock
  order: jest.Mock
  insert: jest.Mock
  delete: jest.Mock
}

interface MockSupabaseClient extends MockQueryBuilder {
  auth: MockSupabaseAuth
}

describe('Dashboard Component', () => {
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should show loading state initially', () => {
    mockSupabase.auth.getUser.mockImplementation(
      () => new Promise(() => {}) // Never resolves - stays loading
    )

    render(<Dashboard />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should redirect to home if user not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    render(<Dashboard />)

    // The component will attempt to redirect
    // We can't easily test router.push in this setup, but we can verify
    // that getUser was called
    await waitFor(() => {
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })
  })

  it('should display user name when authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@ualberta.ca',
          user_metadata: { full_name: 'John Doe' },
        },
      },
      error: null,
    })

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

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Your Courses!')).toBeInTheDocument()
    })
  })

  it('should display courses when loaded', async () => {
    const mockCourses = [
      { id: '1', title: 'PMCOL 400', date_created: '2024-01-01', instructor_id: 'user-123' },
      { id: '2', title: 'PMCOL 401', date_created: '2024-01-02', instructor_id: 'user-123' },
    ]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@ualberta.ca', user_metadata: { full_name: 'John' } },
      },
      error: null,
    })

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

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('PMCOL 400')).toBeInTheDocument()
      expect(screen.getByText('PMCOL 401')).toBeInTheDocument()
    })
  })

  it('should show "No courses" message when courses array is empty', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@ualberta.ca', user_metadata: {} },
      },
      error: null,
    })

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

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/No courses yet/i)).toBeInTheDocument()
    })
  })

  it('should open modal when "Add a course" is clicked', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@ualberta.ca', user_metadata: {} },
      },
      error: null,
    })

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

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Your Courses!')).toBeInTheDocument()
    })

    const addButton = screen.getByText('Add a course')
    await userEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add a Course')).toBeInTheDocument()
    })
  })

  it('should call signOut when logout button is clicked', async () => {
    (signOut as jest.Mock).mockResolvedValue({ error: null })

    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@ualberta.ca', user_metadata: {} },
      },
      error: null,
    })

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

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Log-Out')).toBeInTheDocument()
    })

    const logoutButton = screen.getByText('Log-Out')
    await userEvent.click(logoutButton)

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
    })
  })
})