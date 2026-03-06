import { renderHook, waitFor } from '@testing-library/react';
import { useSessionPage } from '@/hooks/useSessionPage';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';

jest.mock('@/lib/supabase/client');
jest.mock('@/lib/realtime/useRealtime');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useParams: () => ({ lessonId: 'lesson-456' }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Auto-save interval + recovery [US 1.13]', () => {
  let mockSupabase: any;
  let connected = true;

  beforeEach(() => {
    connected = true;
    jest.clearAllMocks();

    (global.fetch as any) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (useRealtime as jest.Mock).mockImplementation(() => ({
      channel: { on: jest.fn(() => ({ unsubscribe: jest.fn() })) },
      isConnected: connected,
    }));

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'disc-1',
                      lesson_id: 'lesson-456',
                      status: 'active',
                      prompt_text: 'Q1',
                      responses: [{ count: 1 }],
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'responses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'r1',
                      discussion_id: 'disc-1',
                      response_text: 'A1',
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('[US 1.13][AT1] auto-sync runs at regular intervals', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const { unmount } = renderHook(() => useSessionPage('lesson-456'));

    await waitFor(
      () => expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000),
      { timeout: 2000 }
    );

    unmount();
  }, 10000);

  it('[US 1.13][AT4] reconnect triggers recovery sync', async () => {
    const { rerender, unmount } = renderHook(() => useSessionPage('lesson-456'));

    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0), {
      timeout: 2000,
    });

    const before = (global.fetch as jest.Mock).mock.calls.length;

    connected = false;
    rerender();

    connected = true;
    rerender();

    await waitFor(
      () => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(before),
      { timeout: 2000 }
    );

    unmount();
  }, 10000);
});


