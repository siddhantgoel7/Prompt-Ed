import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: () => [],
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('Supabase Server Utils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { 
            ...originalEnv, 
            NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
            SUPABASE_SERVICE_ROLE_KEY: 'test-role-key'
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('createClient calls createServerClient with correct parameters', async () => {
        await createClient();
        expect(createServerClient).toHaveBeenCalledWith(
            'https://test.supabase.co',
            'test-anon-key',
            expect.anything()
        );
    });

    it('createAdminClient calls createServerClient with correct parameters', async () => {
        await createAdminClient();
        expect(createServerClient).toHaveBeenCalledWith(
            'https://test.supabase.co',
            'test-role-key',
            expect.anything()
        );
    });
});
