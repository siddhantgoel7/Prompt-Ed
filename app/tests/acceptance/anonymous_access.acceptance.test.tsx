// [US 2.03] Anonymous access
// Tests that students can participate without providing any identifying information

import { render, screen } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/hooks/useStudentSession', () => ({
  useStudentSession: jest.fn(),
}));

jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: (props: any) => (
    <div>
      <div>Ended Header: {props.title}</div>
    </div>
  ),
}));

import { useStudentSession } from '@/hooks/useStudentSession';
const useStudentSessionMock = useStudentSession as jest.Mock;

function makeEndedVM(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    lesson: {
      id: 'lesson-1',
      title: 'Anon Test',
      course_id: 'course-1',
      status: 'ended',
      pin_code: '123456',
      created_at: new Date().toISOString(),
    } as any,
    loading: false,
    notFound: false,
    isConnected: false,
    discussions: [],
    activeDiscussion: null,
    responses: [],
    promptInput: '',
    setPromptInput: jest.fn() as any,
    displayState: false,
    handleDisplay: jest.fn(),
    endingLesson: false,
    endError: null,
    handleEnd: jest.fn(),
    handlePublishDiscussion: jest.fn(),
    handleCloseDiscussion: jest.fn(),
    historyLoading: false,
    historyError: null,
    lessonDiscussions: [],
    exportingData: false,
    activatingLesson: false,
    handleExportLessonData: jest.fn(),
    handleActivate: jest.fn(),
    ...overrides,
  };
}

describe('Anonymous Access (Acceptance) [US 2.03]', () => {
  // 1.1
  it('[US 2.03][AT1] success: student joins without providing name, email, or ID', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: { status: 'active', prompt_text: 'What is X?' },
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: true,
      view: 'active',
      endedMessage: null,
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    render(<StudentSessionPage lessonId="lesson-1" />);

    // Student can see the prompt - joined successfully without authentication
    expect(screen.getByText(/What is X\?/i)).toBeInTheDocument();

    // No login form, no name/email fields present
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/student id/i)).not.toBeInTheDocument();
  });

  // 1.2
  it('[US 2.03][AT2] success: response records contain no identifiable data', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: null,
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: true,
      view: 'submitted',
      endedMessage: null,
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    render(<StudentSessionPage lessonId="lesson-1" />);

    // Confirmation shown - response was submitted
    expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();

    // No student identifiers in the UI
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/@ualberta\.ca/);
    expect(body).not.toMatch(/student-id/i);
  });

  // 1.3
  it('[US 2.03][AT3] success: instructor view has no student identifiers', () => {
    const vm = makeEndedVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'Test prompt',
          status: 'closed',
          created_at: '2026-02-14T10:00:00Z',
          responses: [
            { id: 'r1', response_text: 'Student answer 1', created_at: '2026-02-14T10:01:00Z' },
            { id: 'r2', response_text: 'Student answer 2', created_at: '2026-02-14T10:02:00Z' },
          ],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    // Responses are visible
    expect(screen.getByText(/Student answer 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Student answer 2/i)).toBeInTheDocument();

    // No student identifiers visible to instructor
    const body = document.body.textContent || '';
    expect(body).not.toMatch(/@ualberta\.ca/);
    expect(body).not.toMatch(/student-\d+/);
    expect(body).not.toMatch(/user-\d+/);
  });

  // 1.4
  it('[US 2.03][AT1] failure: ended lesson still shows no identity fields', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: null,
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: true,
      view: 'ended',
      endedMessage: 'Lesson has ended',
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    render(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/Lesson has ended/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });
});