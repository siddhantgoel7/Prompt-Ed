/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/check-email/route';
import { createClient as createAdminClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

describe('Auth Check Email API', () => {
    let mockAdminClient: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAdminClient = {
            auth: {
                admin: {
                    listUsers: jest.fn(),
                },
            },
        };
        (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
    });

    it('success: returns exists true if email found', async () => {
        mockAdminClient.auth.admin.listUsers.mockResolvedValue({
            data: { users: [{ email: 'test@uAlberta.ca' }] },
            error: null
        });

        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({ email: 'test@uAlberta.ca' }) });
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.exists).toBe(true);
    });

    it('success: returns exists false if email not found', async () => {
        mockAdminClient.auth.admin.listUsers.mockResolvedValue({
            data: { users: [{ email: 'other@uAlberta.ca' }] },
            error: null
        });

        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({ email: 'test@uAlberta.ca' }) });
        const res = await POST(req);
        const json = await res.json();

        expect(json.exists).toBe(false);
    });

    it('failure: returns 500 on admin error', async () => {
        mockAdminClient.auth.admin.listUsers.mockResolvedValue({
            data: null,
            error: { message: 'Admin fail' }
        });

        const req = new NextRequest('http://l', { method: 'POST', body: JSON.stringify({ email: 'test@uAlberta.ca' }) });
        const res = await POST(req);
        
        expect(res.status).toBe(500);
    });
});
