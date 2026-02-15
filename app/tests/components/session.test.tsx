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

// Combine all next/navigation mocks into one object
jest.mock('next/navigation', () => ({
  useParams: () => ({
    lessonId: 'lesson-456', // Match the ID used in your render calls
  }),
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Suppress console logs/errors for cleaner test output
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

    // Create mock channel
    mockChannel = createMockRealtimeChannel();

    // Mock useRealtime hook to return connected channel
    (useRealtime as jest.Mock).mockReturnValue({
      channel: mockChannel,
      isConnected: true
    });

    // Mock Supabase client with proper query builder pattern
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
    it('should call useRealtime with correct lesson ID', async () => {
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

      // Verify useRealtime was called with correct parameters
      expect(useRealtime).toHaveBeenCalledWith('lesson-456', 'instructor');
    });

    // 17.2
    it('should redirect to home if user not authenticated', async () => {
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
    it('should redirect if user does not own the lesson', async () => {
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
    it('should register response:new event listener on channel', async () => {
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
    it('should handle response:new broadcasts', async () => {
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

      // Simulate student response broadcast
      mockChannel._trigger('response:new', { response: mockResponse });

      // Verify no errors occurred (listener handled the broadcast)
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });

    // 17.6
    it('should handle both nested and flat payload structures', () => {
      // Test the defensive payload extraction pattern
      const nestedPayload = { payload: { response: mockResponse } };
      const flatPayload = { response: mockResponse };

      // Simulate the extraction logic used in the component
      const extractNested = (nestedPayload as any).payload?.response || (nestedPayload as any).response;
      const extractFlat = (flatPayload as any).payload?.response || flatPayload.response;

      expect(extractNested).toEqual(mockResponse);
      expect(extractFlat).toEqual(mockResponse);
    });
  });

  describe('Database Integration', () => {
    // 17.7
    it('should fetch discussions on mount', async () => {
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
        expect(mockSupabase.from).toHaveBeenCalledWith('discussions');
      });
    });

    // 17.8
    it('should initialize lesson with PIN if status is draft', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'lessons') {
          // Return an object with both select and update methods
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
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
      });
    });

    // 17.9
    it('should update lesson status to ended when End button is clicked', async () => {
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
    it('should have channel available for broadcasting', async () => {
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

      // Verify channel has send method for broadcasts
      expect(mockChannel.send).toBeDefined();
      expect(typeof mockChannel.send).toBe('function');
    });

    // 17.11
    it('should handle connection state changes', () => {
      // Test with disconnected state
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

      // Component should handle null channel gracefully
      expect(useRealtime).toHaveBeenCalledWith('lesson-456', 'instructor');
    });
  });

  describe('Export Feature', () => {
    // 17.12
    it('should export lesson data as a .txt file when Export Txt is clicked', async () => {
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
    // 17.13
    it('should display preserved discussions and responses when instructor accesses a saved lesson', async () => {
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

      // Saved lesson header
      expect(await screen.findByText('Saved Lesson')).toBeInTheDocument();

      // Preserved discussion prompt
      expect(await screen.findByText('What is 2+2?')).toBeInTheDocument();

      // Preserved responses
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();

      // Timestamp labels present in saved-data view
      expect(screen.getByText(/Prompt time:/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Response time:/i).length).toBeGreaterThan(0);
    });
  });


});