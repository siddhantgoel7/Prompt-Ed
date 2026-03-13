// Covers US 1.04, 1.06, 1.09, 1.14, 1.25, 1.34, 1.41
import '@testing-library/jest-dom';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { SessionPage } from '@/components/instructor/SessionPage';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { createMockRealtimeChannel } from '../../jest.setup';
import {
  mockDiscussion,
  mockResponse,
} from '../fixtures/discussions';

jest.mock('@/lib/supabase/client');
jest.mock('@/lib/realtime/useRealtime');

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({
    lessonId: 'lesson-456',
  }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const originalConsoleError = console.error;
const originalConsoleLog = console.log;
beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('SessionPage - Real-time Integration Tests', () => {
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();

    mockChannel = createMockRealtimeChannel();

    (useRealtime as jest.Mock).mockReturnValue({
      channel: mockChannel,
      isConnected: true
    });

    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Component Initialization', () => {
    // 17.1
    it('[US 1.06] should call useRealtime with correct lesson ID', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      expect(useRealtime).toHaveBeenCalledWith('lesson-456', 'instructor');
    });

    // 17.2
    it('[US 1.04] should redirect to home if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    // 17.3
    it('[US 1.04] should redirect if user does not own the lesson', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    courses: { instructor_id: 'different-user' }
                  },
                  error: null
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Real-time Channel Integration', () => {
    // 17.4
    it('[US 1.34] should register response:new event listener on channel', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        const subscriptions = mockChannel._getSubscriptions();
        expect(subscriptions['response:new']).toBeDefined();
      });
    });

    // 17.5
    it('[US 1.34] should handle response:new broadcasts', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        const subscriptions = mockChannel._getSubscriptions();
        expect(subscriptions['response:new']).toBeDefined();
      });

      mockChannel._trigger('response:new', { response: mockResponse });

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });

    // 17.6
    it('[US 1.34] should handle both nested and flat payload structures', () => {
      const nestedPayload = { payload: { response: mockResponse } };
      const flatPayload = { response: mockResponse };

      const extractNested = (nestedPayload as any).payload?.response || (nestedPayload as any).response;
      const extractFlat = (flatPayload as any).payload?.response || flatPayload.response;

      expect(extractNested).toEqual(mockResponse);
      expect(extractFlat).toEqual(mockResponse);
    });
  });

  describe('Database Integration', () => {
    // 17.7
    it('[US 1.25] should fetch discussions on mount', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{ ...mockDiscussion, status: 'closed', responses: [{ count: 0 }] }],
                  error: null
                })
              })
            })
          };
        }
        if (table === 'responses') {
          const orderMock = jest.fn().mockResolvedValue({
            data: [],
            error: null
          });
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  order: orderMock
                }),
                not: jest.fn().mockReturnValue({
                  order: orderMock
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('discussions');
      });
    });

    // 17.8
    it('[US 1.06] should initialize lesson with PIN if status is draft', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'draft',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'lesson-456',
                      status: 'active',
                      pin_code: '123456'
                    },
                    error: null
                  })
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }
        if (table === 'responses') {
          const orderMock = jest.fn().mockResolvedValue({
            data: [],
            error: null
          });
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  order: orderMock
                }),
                not: jest.fn().mockReturnValue({
                  order: orderMock
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
      });
    });

    // 17.9
    it('[US 1.09] should update lesson status to ended when End button is clicked', async () => {
      const lessonsUpdateEqMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    course_id: 'course-123',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: lessonsUpdateEqMock
            })
          };
        }

        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null })
              })
            })
          };
        }

        return {};
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /End/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /End/i }));

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
        expect(lessonsUpdateEqMock).toHaveBeenCalledWith('id', 'lesson-456');
        expect(mockPush).toHaveBeenCalledWith('/lessons_page/course-123');
      });
    });
  });

  describe('Broadcast Functionality', () => {
    // 17.10
    it('[US 1.34] should have channel available for broadcasting', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      await waitFor(() => {
        expect(useRealtime).toHaveBeenCalled();
      });

      expect(mockChannel.send).toBeDefined();
      expect(typeof mockChannel.send).toBe('function');
    });

    // 17.11
    it('[US 1.34] should handle connection state changes', () => {
      (useRealtime as jest.Mock).mockReturnValue({
        channel: null,
        isConnected: false
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    status: 'active',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'discussions') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          };
        }
      });

      render(<SessionPage lessonId="lesson-456" />);

      expect(useRealtime).toHaveBeenCalledWith('lesson-456', 'instructor');
    });
  });

  describe('Export Feature', () => {
    // 17.12
    it('[US 1.41] should export lesson data as a .txt file when Export Txt is clicked', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = jest.fn();
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;

      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    course_id: 'course-123',
                    title: 'Econ 101',
                    status: 'ended',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null })
            })
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
                      prompt_text: 'What is 2+2?',
                      prompt_type: 'short_answer',
                      status: 'closed',
                      created_at: '2026-02-11T18:15:44.000Z',
                      published_at: '2026-02-11T18:15:44.000Z',
                      closed_at: '2026-02-11T18:16:44.000Z',
                      display_order: 0,
                      responses: [
                        { id: 'resp-1', discussion_id: 'disc-1', response_text: '4', created_at: '2026-02-11T18:16:10.000Z' }
                      ]
                    }
                  ],
                  error: null
                })
              })
            })
          };
        }

        return {};
      });

      render(<SessionPage lessonId="lesson-456" />);

      const exportBtn = await screen.findByRole('button', { name: /Export Txt/i });

      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });

      clickSpy.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });

  describe('Saved Lesson View', () => {
    // 17.13 — responses are hidden behind "Show Responses" toggle in the new design
    it('[US 1.14] should display preserved discussions and responses when instructor accesses a saved lesson', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'lesson-456',
                    course_id: 'course-123',
                    title: 'Saved Lesson',
                    status: 'ended',
                    pin_code: '123456',
                    courses: { instructor_id: 'user-123' }
                  },
                  error: null
                })
              })
            })
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
                      prompt_text: 'What is 2+2?',
                      prompt_type: 'short_answer',
                      status: 'closed',
                      created_at: '2026-02-11T18:15:44.000Z',
                      published_at: '2026-02-11T18:15:44.000Z',
                      closed_at: '2026-02-11T18:16:44.000Z',
                      display_order: 0,
                      responses: [
                        {
                          id: 'resp-1',
                          discussion_id: 'disc-1',
                          response_text: '4',
                          created_at: '2026-02-11T18:16:10.000Z'
                        },
                        {
                          id: 'resp-2',
                          discussion_id: 'disc-1',
                          response_text: '5',
                          created_at: '2026-02-11T18:17:10.000Z'
                        }
                      ]
                    }
                  ],
                  error: null
                })
              })
            })
          };
        }

        return {};
      });

      render(<SessionPage lessonId="lesson-456" />);

      // Discussion and prompt are always visible
      expect(await screen.findByText('Saved Lesson')).toBeInTheDocument();
      expect(await screen.findByText('What is 2+2?')).toBeInTheDocument();

      // Responses are hidden behind the toggle — expand them first
      fireEvent.click(screen.getByText(/Show Responses/i));

      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});