/**
 * @jest-environment node
 */
import { GET } from '@/app/api/auth/callback/route';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/server', () => {
    return {
        NextRequest: jest.fn().mockImplementation((url, init) => ({
            url,
            method: init?.method ?? 'GET',
            formData: async () => init?.body,
            nextUrl: new URL(url),
        })),
        NextResponse: {
            json: (data: any, init?: any) => ({
                status: init?.status ?? 200,
                json: async () => data,
            }),
            redirect: (dest: string) => ({
                status: 302,
                headers: new Map([['location', dest]]),
                destination: dest,
            }),
        },
    };
});

describe('Auth Callback API', () => {
  let mockSupabase: any;
  const origin = 'http://localhost:3000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
        getUser: jest.fn().mockResolvedValue({ data: { user: { email: 'student@ualberta.ca', id: 'u1' } } }),
        signOut: jest.fn().mockResolvedValue({}),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('success: redirects to dashboard for UAlberta email', async () => {
    const req = new NextRequest(`${origin}/api/auth/callback?code=123`);
    const res = await GET(req as any);

    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('123');
    expect((res as any).destination).toBe(`${origin}/instructor_dashboard`);
  });

  it('failure: redirects with error if not UAlberta email', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: 'hacker@gmail.com', id: 'u1' } } });
    
    const mockAdminAuth = { admin: { deleteUser: jest.fn().mockResolvedValue({}) } };
    (createAdminClient as jest.Mock).mockReturnValue({ auth: mockAdminAuth });

    const req = new NextRequest(`${origin}/api/auth/callback?code=123`);
    const res = await GET(req as any);

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(mockAdminAuth.admin.deleteUser).toHaveBeenCalledWith('u1');
    expect((res as any).destination).toContain('create_instructor?error=');
    expect((res as any).destination).toContain('UAlberta');
  });

  it('failure: redirects with error on OAuth exchange error', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'OAuth failed' } });
    
    const req = new NextRequest(`${origin}/api/auth/callback?code=123`);
    const res = await GET(req as any);

    expect((res as any).destination).toContain('create_instructor?error=OAuth%20failed');
  });

  it('success: redirects even if no code provided', async () => {
    const req = new NextRequest(`${origin}/api/auth/callback`);
    const res = await GET(req as any);

    expect((res as any).destination).toBe(`${origin}/instructor_dashboard`);
  });
});
