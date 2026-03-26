import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { signUpWithEmail, signInWithEmail } from '@/lib/supabase/auth';
import { cookies } from 'next/headers';
import { createServerClient as ssrCreateServerClient, createBrowserClient as ssrCreateBrowserClient } from '@supabase/ssr';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
  createBrowserClient: jest.fn(),
}));

describe('Supabase Client Factory Helpers', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('createClient (server): sets up server client with cookies', async () => {
    const mockCookies = { getAll: jest.fn().mockReturnValue([]), set: jest.fn() };
    (cookies as jest.Mock).mockResolvedValue(mockCookies);

    await createServerClient();

    expect(ssrCreateServerClient).toHaveBeenCalledWith(
        'http://localhost:54321', 
        'anon', 
        expect.objectContaining({ cookies: expect.any(Object) })
    );
  });

  it('createClient (browser): sets up browser client', () => {
    createBrowserClient();
    expect(ssrCreateBrowserClient).toHaveBeenCalledWith('http://localhost:54321', 'anon');
  });
});

describe('Supabase Auth Helpers', () => {
    let mockAuth: any;

    beforeEach(() => {
        mockAuth = {
            signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
            signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
        };
        (ssrCreateBrowserClient as jest.Mock).mockReturnValue({ auth: mockAuth });
    });

    it('signUpWithEmail: calls supabase sign up', async () => {
        await signUpWithEmail('e', 'p', 'name');
        expect(mockAuth.signUp).toHaveBeenCalledWith({
            email: 'e',
            password: 'p',
            options: { data: { full_name: 'name' } }
        });
    });

    it('signInWithEmail: calls supabase sign in', async () => {
        await signInWithEmail('e', 'p');
        expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'e', password: 'p' });
    });
});
