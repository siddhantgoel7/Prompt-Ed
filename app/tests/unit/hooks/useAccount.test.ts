import { renderHook, act, waitFor } from '@testing-library/react';
import { useAccount } from '@/hooks/useAccount';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/supabase/auth';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/supabase/auth', () => ({
  signOut: jest.fn(),
}));

describe('useAccount hook', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };
  let consoleSpy: jest.SpyInstance;

  const mockUser = {
    id: 'user-123',
    email: 'instructor@ualberta.ca',
    user_metadata: { full_name: 'Dr. Test' },
  };

  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('loads user on mount and sets loading to false', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAccount());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('redirects to login if no user is found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    renderHook(() => useAccount());

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login_instructor');
    });
  });

  it('handles logout successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (signOut as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(result.current.loggingOut).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('handles logout error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (signOut as jest.Mock).mockResolvedValue({ error: { message: 'Signout failed' } });

    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(result.current.error).toBe('Signout failed');
    expect(result.current.loggingOut).toBe(false);
  });

  it('handles account deletion successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    expect(result.current.deleting).toBe(true);
    expect(mockRouter.push).toHaveBeenCalledWith('/');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('handles account deletion failure', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Deletion failed' }),
    });

    const { result } = renderHook(() => useAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    expect(result.current.error).toBe('Deletion failed');
    expect(result.current.deleting).toBe(false);
  });
});
