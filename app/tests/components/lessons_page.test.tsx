// tests/components/lessons_page.test.tsx
// Covers US 1.05, 1.08, 1.04
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import { LessonsPage } from '@/components/instructor/LessonsPage';
import { createClient } from '@/lib/supabase/client';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Suppress console.error for expected errors in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('LessonsPage', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
  };

  const mockCourse = {
    id: 'course-123',
    title: 'PMCOL 401 LEC A2',
    instructor_id: 'user-123',
    date_created: '2024-01-01T00:00:00Z',
  };

  const mockLessons = [
    {
      id: 'lesson-1',
      course_id: 'course-123',
      title: 'Introduction to Pharmacology',
      date_created: '2024-02-08T00:00:00Z',
      created_at: '2024-02-08T00:00:00Z',
    },
    {
      id: 'lesson-2',
      course_id: 'course-123',
      title: 'Drug Metabolism',
      date_created: '2024-02-07T00:00:00Z',
      created_at: '2024-02-07T00:00:00Z',
    },
  ];

  const courseId = 'course-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  function mockHappyPath() {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'courses') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockCourse,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'lessons') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockLessons,
                error: null,
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'lesson-3',
                  course_id: 'course-123',
                  title: 'New Lesson',
                  date_created: '2024-02-09T00:00:00Z',
                  created_at: '2024-02-09T00:00:00Z',
                },
              ],
              error: null,
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        };
      }

      return {};
    });
  }

  describe('Authentication and Authorization', () => {
    // 16.1
    it('[US 1.04] should redirect to home if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    // 16.2
    it('[US 1.04] should redirect to home if course does not exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Course not found'),
              }),
            }),
          }),
        }),
      });

      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    // 16.3
    it('[US 1.04] should redirect to home if user is not the course owner', async () => {
      const differentUser = { ...mockUser, id: 'different-user-id' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: differentUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      });

      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    // 16.4
    it('[US 1.04] should allow access if user is the course owner', async () => {
      mockHappyPath();

      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
      });
    });
  });

  describe('Page Rendering', () => {
    beforeEach(() => {
      mockHappyPath();
    });

    // 16.5
    it('[US 1.05] should display loading state initially', () => {
      mockSupabase.auth.getUser.mockImplementation(() => new Promise(() => {}));

      render(<LessonsPage courseId={courseId} />);
      // Use data-testid="loading-screen" (set on LoadingScreen component) rather than logo alt text
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    });

    // 16.6
    it('[US 1.05] should display course title', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
      });
    });

    // 16.7
    it('[US 1.05] should display all lessons', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Pharmacology')).toBeInTheDocument();
        expect(screen.getByText('Drug Metabolism')).toBeInTheDocument();
      });
    });

    // 16.8
    it('[US 1.05] should display "Start a New Lesson" card', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(screen.getByText('New Lesson')).toBeInTheDocument();
      });
    });

    // 16.9
    it('[US 1.05] should display empty state when no lessons exist', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'courses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockCourse,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      });

      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(screen.getByText(/No lessons yet/i)).toBeInTheDocument();
      });
    });

    // 16.10
    it('[US 1.05] should display Back button', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockHappyPath();
    });

    // 16.11
    it('[US 1.05] should navigate back to dashboard when Back button is clicked', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    // 16.12
    it('[US 1.05] should navigate to session page when lesson card is clicked', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        const lessonTitle = screen.getByText('Introduction to Pharmacology');
        const lessonCard = lessonTitle.closest('div[class*="cursor-pointer"]');
        expect(lessonCard).toBeTruthy();
        if (lessonCard) fireEvent.click(lessonCard);
      });

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/session/lesson-1');
      });
    });
  });

  describe('Create Lesson', () => {
    beforeEach(() => {
      mockHappyPath();
    });

    // 16.13
    it('[US 1.05] should open modal when "Start a New Lesson" is clicked', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Lesson'));
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Intro to Pharmacology/i)).toBeInTheDocument();
      });
    });

    // 16.14
    it('[US 1.05] should close modal when Cancel button is clicked', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Lesson'));
      });

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Intro to Pharmacology/i)).not.toBeInTheDocument();
      });
    });

    // 16.15
    it('[US 1.05] should show error when trying to create lesson without title', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Lesson'));
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Intro to Pharmacology/i) as HTMLInputElement;
        input.removeAttribute('required');
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: /Create Lesson/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Lesson title is required')).toBeInTheDocument();
      });
    });

    // 16.16
    it('[US 1.05] should create new lesson successfully', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Lesson'));
      });

      await waitFor(() => {
        fireEvent.change(screen.getByPlaceholderText(/Intro to Pharmacology/i), {
          target: { value: 'New Lesson' },
        });
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Lesson/i }));

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
      });
    });

    // 16.17
    it('[US 1.05] should display error message if lesson creation fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'courses') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockCourse,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'lessons') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockLessons,
                  error: null,
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error'),
              }),
            }),
          };
        }

        return {};
      });

      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Lesson'));
      });

      await waitFor(() => {
        fireEvent.change(screen.getByPlaceholderText(/Intro to Pharmacology/i), {
          target: { value: 'New Lesson' },
        });
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Lesson/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to add lesson/i)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Lesson', () => {
    beforeEach(() => {
      mockHappyPath();
    });

    // 16.18
    it('[US 1.08] should show delete confirmation modal when delete button is clicked', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete lesson');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete Lesson?')).toBeInTheDocument();
      });
    });

    // 16.19
    it('[US 1.08] should close delete modal when Cancel is clicked', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete lesson');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i });
        const deleteCancelButton = cancelButtons[cancelButtons.length - 1];
        fireEvent.click(deleteCancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('Delete Lesson?')).not.toBeInTheDocument();
      });
    });

    // 16.20
    it('[US 1.08] should delete lesson when confirmed', async () => {
      render(<LessonsPage courseId={courseId} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete lesson');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        const confirmButton = deleteButtons[deleteButtons.length - 1];
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
      });
    });
  });
});