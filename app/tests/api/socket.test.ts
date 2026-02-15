/** @jest-environment node */

import { GET } from '@/app/api/socket/route';

describe('[API] GET /api/socket', () => {
  //11.1
  it('returns placeholder message', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      message:
        'Socket.io requires custom server setup. Use Supabase Realtime or deploy with custom server.',
    });
  });
});
