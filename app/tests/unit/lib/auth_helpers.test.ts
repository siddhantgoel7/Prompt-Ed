import { signUpWithEmail, signInWithEmail, signInWithGoogle, signOut } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(),
}));

describe('Auth Helpers Coverage', () => {
    let mockSupabase: any;

    beforeEach(() => {
        mockSupabase = {
            auth: {
                signUp: jest.fn().mockResolvedValue({ data: {}, error: null }),
                signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
                signInWithOAuth: jest.fn().mockResolvedValue({ data: {}, error: null }),
                signOut: jest.fn().mockResolvedValue({ error: null }),
            }
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    it('hits all auth helpers', async () => {
        await signUpWithEmail('t@t.com', 'pwd', 'Name');
        await signInWithEmail('t@t.com', 'pwd');
        await signInWithGoogle();
        await signOut();

        expect(mockSupabase.auth.signUp).toHaveBeenCalled();
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalled();
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
});
