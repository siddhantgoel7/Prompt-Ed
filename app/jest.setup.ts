import '@testing-library/jest-dom'

// Mock canvas-confetti (browser-only library not available in jsdom)
jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: jest.fn(),
}), { virtual: true })

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve([])
})) as jest.Mock;

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

/**
 * Creates a mock Supabase Realtime channel for testing.
 *
 * Features:
 * - Stores event listeners in a subscriptions map
 * - Provides _trigger() method to simulate incoming broadcasts
 * - Tracks subscription status (SUBSCRIBED/CLOSED)
 * - Supports multiple listeners per event type
 *
 * Usage in tests:
 * const mockChannel = createMockRealtimeChannel();
 * mockChannel._trigger('discussion:published', { discussion: mockDiscussion });
 */
export function createMockRealtimeChannel() {
  const subscriptions: Record<string, Array<(payload: unknown) => void>> = {};
  let subscribeCallback: ((status: string) => void) | null = null;

  return {
    subscribe: jest.fn((callback?: (status: string) => void) => {
      subscribeCallback = callback || null;
      // Simulate async subscription with 'SUBSCRIBED' status
      setTimeout(() => {
        if (subscribeCallback) subscribeCallback('SUBSCRIBED');
      }, 0);
      return undefined;
    }),
    unsubscribe: jest.fn(() => {
      if (subscribeCallback) subscribeCallback('CLOSED');
    }),
    on: jest.fn((type: string, selector: { event: string }, callback: (payload: unknown) => void) => {
      const eventKey = selector.event;
      if (!subscriptions[eventKey]) {
        subscriptions[eventKey] = [];
      }
      subscriptions[eventKey].push(callback);
      return {
        unsubscribe: jest.fn(() => {
          const index = subscriptions[eventKey]?.indexOf(callback);
          if (index !== undefined && index > -1) {
            subscriptions[eventKey].splice(index, 1);
          }
        })
      };
    }),
    send: jest.fn().mockResolvedValue(1), // Returns acknowledgment status code
    off: jest.fn(),
    /**
     * Test utility to trigger a broadcast event.
     * Simulates Supabase Realtime's double-wrapping of payloads.
     *
     * @param event - Event name (e.g., 'discussion:published')
     * @param payload - Event payload data
     */
    _trigger: (event: string, payload: unknown) => {
      if (subscriptions[event]) {
        subscriptions[event].forEach(cb => {
          // Simulate Supabase's payload wrapping structure
          cb({ payload });
        });
      }
    },
    /**
     * Test utility to get all subscribed events.
     */
    _getSubscriptions: () => subscriptions
  };
}
