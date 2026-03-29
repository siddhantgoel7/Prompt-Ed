import { DELETE } from '@/app/api/user/delete/route';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      data,
      status: init?.status || 200,
    })),
  },
}));

describe('DELETE /api/user/delete', () => {
  const userId = 'user-123';
  const mockUser = { id: userId };

  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  };

  const mockAdminSupabase = {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    auth: {
      admin: {
        deleteUser: jest.fn(),
      },
    },
  };

  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    (createAdminClient as jest.Mock).mockResolvedValue(mockAdminSupabase);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth failed' },
    });

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' }, { status: 401 });
  });

  it('processes account deletion successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock storage cleanup (Step 2)
    const mockStorageFrom = {
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    mockAdminSupabase.storage.from.mockReturnValue(mockStorageFrom);
    
    // Mock files fetch
    mockAdminSupabase.from.mockImplementation((table) => {
      if (table === 'lesson_files') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              data: [{ storage_path: 'p1' }, { storage_path: 'p2' }], 
              error: null 
            }),
          }),
        };
      }
      return {};
    });

    // Mock auth delete user (Step 3)
    mockAdminSupabase.auth.admin.deleteUser.mockResolvedValue({ error: null });

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mockAdminSupabase.storage.from).toHaveBeenCalledWith('lesson-files');
    expect(mockStorageFrom.remove).toHaveBeenCalledWith(['p1', 'p2']);
    expect(mockAdminSupabase.auth.admin.deleteUser).toHaveBeenCalledWith(userId);
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('returns 500 if auth deletion fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Empty storage fetch
    mockAdminSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock auth delete user failure
    mockAdminSupabase.auth.admin.deleteUser.mockResolvedValue({ 
      error: { message: 'Database failure' } 
    });

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Failed to delete account from auth' }, 
      { status: 500 }
    );
  });

  it('handles global errors in catch block', async () => {
    mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected crash'));

    const response = await DELETE();

    expect(response.status).toBe(500);
    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  });
});
