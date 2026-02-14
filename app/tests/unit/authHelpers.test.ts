import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Define proper types for the mock
interface MockSupabaseAuth {
  signUp: jest.Mock
  signInWithPassword: jest.Mock
  signInWithOAuth: jest.Mock
  signOut: jest.Mock
  getUser: jest.Mock
}

interface MockSupabaseClient {
  auth: MockSupabaseAuth
}

describe('Auth Helpers [US 1.01][US 1.02][US 1.03]', () => {
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    mockSupabase = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signInWithOAuth: jest.fn(),
        signOut: jest.fn(),
        getUser: jest.fn(),
      },
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('signUpWithEmail [US 1.01]', () => {
    it('[US 1.01][AT1] should call Supabase signUp with correct parameters', async () => {
      const { signUpWithEmail } = await import('@/lib/supabase/auth')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      })

      const result = await signUpWithEmail('test@ualberta.ca', 'password123', 'Test User')

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@ualberta.ca',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })
      expect(result.error).toBeNull()
    })

    it('[US 1.01][AT3] should return error when signup fails', async () => {
      const { signUpWithEmail } = await import('@/lib/supabase/auth')

      mockSupabase.auth.signUp.mockResolvedValue({
        data: null,
        error: { message: 'User already exists' },
      })

      const result = await signUpWithEmail('test@ualberta.ca', 'password123', 'Test User')

      expect(result.error).toBeTruthy()
      expect(result.error?.message).toBe('User already exists')
    })
  })

  describe('signInWithEmail [US 1.02]', () => {
    it('[US 1.02][AT1] should call Supabase signInWithPassword with correct parameters', async () => {
      const { signInWithEmail } = await import('@/lib/supabase/auth')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      })

      await signInWithEmail('test@ualberta.ca', 'password123')

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@ualberta.ca',
        password: 'password123',
      })
    })

    it('[US 1.02][AT2] should return error when credentials are wrong', async () => {
      const { signInWithEmail } = await import('@/lib/supabase/auth')

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      })

      const result = await signInWithEmail('test@ualberta.ca', 'wrongpassword')

      expect(result.error?.message).toBe('Invalid login credentials')
    })
  })

  describe('signOut [US 1.03]', () => {
    it('[US 1.03][AT1] should call Supabase signOut', async () => {
      const { signOut } = await import('@/lib/supabase/auth')

      mockSupabase.auth.signOut.mockResolvedValue({ error: null })

      await signOut()

      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })
  })
})