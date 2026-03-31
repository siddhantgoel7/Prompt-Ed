/**
 * @jest-environment node
 *
 * Tests for the word-cloud server page auth/ownership/fetch logic.
 * The page is a Next.js async server component — we test it by calling it directly.
 */
import { createClient } from '@/lib/supabase/server';

// Mock navigation helpers so redirect/notFound don't throw
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
  notFound: jest.fn(() => { throw new Error('NOT_FOUND'); }),
}));

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

// WordCloudPageClient is a client component — stub it for node environment
jest.mock('@/components/instructor/session/WordCloudPageClient', () => ({
  WordCloudPageClient: () => null,
}));

import WordCloudPage from '@/app/session/[lessonId]/word-cloud/[discussionId]/page';

const lessonId = 'lesson-1';
const discussionId = 'disc-1';
const userId = 'user-1';
const makeParams = () => ({ params: Promise.resolve({ lessonId, discussionId }) });

function buildSupabase(overrides: Record<string, any> = {}) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'lessons') return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, courses: { instructor_id: userId } }, error: null }) }) })
      };
      if (table === 'discussions') return {
        select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: discussionId }, error: null }) }) }) })
      };
      if (table === 'responses') return {
        select: () => ({ eq: () => ({ is: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) })
      };
      return {};
    }),
    ...overrides,
  };
}

describe('WordCloudPage (server component)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('redirects to / when unauthenticated', async () => {
    const supabase = buildSupabase({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) } });
    (createClient as jest.Mock).mockResolvedValue(supabase);
    await expect(WordCloudPage(makeParams())).rejects.toThrow('REDIRECT:/');
  });

  it('redirects to / when lesson not found', async () => {
    const supabase = buildSupabase();
    supabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      return {};
    });
    (createClient as jest.Mock).mockResolvedValue(supabase);
    await expect(WordCloudPage(makeParams())).rejects.toThrow('REDIRECT:/');
  });

  it('redirects to / when user is not the instructor', async () => {
    const supabase = buildSupabase();
    supabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, courses: { instructor_id: 'other-user' } }, error: null }) }) }) };
      return {};
    });
    (createClient as jest.Mock).mockResolvedValue(supabase);
    await expect(WordCloudPage(makeParams())).rejects.toThrow('REDIRECT:/');
  });

  it('calls notFound when discussion does not exist', async () => {
    const supabase = buildSupabase();
    supabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'lessons') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: lessonId, courses: { instructor_id: userId } }, error: null }) }) }) };
      if (table === 'discussions') return { select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'not found' } }) }) }) }) };
      if (table === 'responses') return { select: () => ({ eq: () => ({ is: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }) };
      return {};
    });
    (createClient as jest.Mock).mockResolvedValue(supabase);
    await expect(WordCloudPage(makeParams())).rejects.toThrow('NOT_FOUND');
  });

  it('renders successfully for the lesson owner', async () => {
    (createClient as jest.Mock).mockResolvedValue(buildSupabase());
    // Should not throw — renders WordCloudPageClient (stubbed to null)
    await expect(WordCloudPage(makeParams())).resolves.toBeDefined();
  });
});
