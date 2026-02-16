// tests/acceptance/student_session_page.test.tsx
import { render, screen } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

jest.mock('@/hooks/useStudentSession', () => ({
  useStudentSession: jest.fn(),
}));

import { useStudentSession } from '@/hooks/useStudentSession';
const useStudentSessionMock = useStudentSession as jest.Mock;

describe('Student Session Page (Acceptance)', () => {
  // 12.1
  it('[US 2.09][AT1] success: shows prompt when discussion active', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: { status: 'active', prompt_text: 'What is 2+2?' },
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
    expect(screen.getByText(/What is 2\+2\?/i)).toBeInTheDocument();
  });

  // 12.2
  it('[US 2.07][AT4] success: shows confirmation after submission', () => {
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
    expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
  });

  // 12.3
  it('[US 1.09][AT3][US 2.03][AT4] failure: lesson ended shows ended message', () => {
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
    expect(screen.getByText(/Lesson ended/i)).toBeInTheDocument();
    expect(screen.getByText(/Lesson has ended/i)).toBeInTheDocument();
  });

  // 12.4
  it('[US 2.06][AT1] failure: disconnected shows "Connecting…" hint', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: null,
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: false,
      view: 'waiting',
      endedMessage: null,
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
  });
});