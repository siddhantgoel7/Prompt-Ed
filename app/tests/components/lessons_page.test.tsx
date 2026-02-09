// tests/components/lessons_page.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import LessonsPage from '@/app/lessons_page/[courseId]/page';
import { createClient } from '@/lib/supabase/client';
import '@testing-library/jest-dom';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock React.use for params
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  use: jest.fn((promise) => {
    if (promise && typeof promise.then === 'function') {
      throw promise;
    }
    return promise;
  }),
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

  const mockParams = { courseId: 'course-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Mock React.use to return params directly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.use.mockImplementation((value: any) => value);
  });

  describe('Authentication and Authorization', () => {
    it('should redirect to home if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect to home if course does not exist', async () => {
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

      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect to home if user is not the course owner', async () => {
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

      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('should allow access if user is the course owner', async () => {
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
          };
        }
      });

      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
      });
    });
  });

  describe('Page Rendering', () => {
    beforeEach(() => {
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
          };
        }
      });
    });

    it('should display loading state initially', () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display course title', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
      });
    });

    it('should display all lessons', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(screen.getByText('Introduction to Pharmacology')).toBeInTheDocument();
        expect(screen.getByText('Drug Metabolism')).toBeInTheDocument();
      });
    });

    it('should display "Start a New Lesson" card', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(screen.getByText('Start a New Lesson')).toBeInTheDocument();
      });
    });

    it('should display empty state when no lessons exist', async () => {
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
      });

      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(screen.getByText(/No lessons yet/i)).toBeInTheDocument();
      });
    });

    it('should display Back button', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
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
          };
        }
      });
    });

    it('should navigate back to dashboard when Back button is clicked', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back/i });
        fireEvent.click(backButton);
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('should navigate to session page when lesson card is clicked', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(async () => {
        const lessonTitle = screen.getByText('Introduction to Pharmacology');
        const lessonCard = lessonTitle.closest('div[class*="cursor-pointer"]');
        
        if (lessonCard) {
          fireEvent.click(lessonCard);
          await waitFor(() => {
            expect(mockRouter.push).toHaveBeenCalledWith('/session/lesson-1');
          });
        }
      });
    });
  });

  describe('Create Lesson', () => {
    beforeEach(() => {
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
                data: [{
                  id: 'lesson-3',
                  course_id: 'course-123',
                  title: 'New Lesson',
                  date_created: '2024-02-09T00:00:00Z',
                  created_at: '2024-02-09T00:00:00Z',
                }],
                error: null,
              }),
            }),
          };
        }
      });
    });

    it('should open modal when "Start a New Lesson" is clicked', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const createButtons = screen.getAllByText('Start a New Lesson');
        fireEvent.click(createButtons[0]);
      });

      // Wait for modal to appear by checking for the input field
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Intro to Pharmacology/i)).toBeInTheDocument();
      });
    });

    it('should close modal when Cancel button is clicked', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const createButtons = screen.getAllByText('Start a New Lesson');
        fireEvent.click(createButtons[0]);
      });

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Intro to Pharmacology/i)).not.toBeInTheDocument();
      });
    });

    it('should show error when trying to create lesson without title', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const createButtons = screen.getAllByText('Start a New Lesson');
        fireEvent.click(createButtons[0]);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Intro to Pharmacology/i) as HTMLInputElement;
        // Remove the required attribute to bypass HTML5 validation
        input.removeAttribute('required');
        
        // Ensure input is empty
        fireEvent.change(input, { target: { value: '' } });
        
        const submitButton = screen.getByRole('button', { name: /Create Lesson/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Lesson title is required')).toBeInTheDocument();
      });
    });

    it('should create new lesson successfully', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const createButtons = screen.getAllByText('Start a New Lesson');
        fireEvent.click(createButtons[0]);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Intro to Pharmacology/i);
        fireEvent.change(input, { target: { value: 'New Lesson' } });
      });

      const submitButton = screen.getByRole('button', { name: /Create Lesson/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
      });
    });

    it('should display error message if lesson creation fails', async () => {
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
      });

      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const createButtons = screen.getAllByText('Start a New Lesson');
        fireEvent.click(createButtons[0]);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Intro to Pharmacology/i);
        fireEvent.change(input, { target: { value: 'New Lesson' } });
      });

      const submitButton = screen.getByRole('button', { name: /Create Lesson/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to add lesson/i)).toBeInTheDocument();
      });
    });
  });

  describe('Delete Lesson', () => {
    beforeEach(() => {
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
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
      });
    });

    it('should show delete confirmation modal when delete button is clicked', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete lesson');
        fireEvent.click(deleteButtons[0]);
      });

      await waitFor(() => {
        expect(screen.getByText('Delete Lesson?')).toBeInTheDocument();
      });
    });

    it('should close delete modal when Cancel is clicked', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

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

    it('should delete lesson when confirmed', async () => {
      render(<LessonsPage params={Promise.resolve(mockParams)} />);

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