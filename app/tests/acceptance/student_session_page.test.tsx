// tests/acceptance/student_session_page.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

jest.mock('@/hooks/useStudentSession', () => ({
  useStudentSession: jest.fn(),
}));

import { useStudentSession } from '@/hooks/useStudentSession';
const useStudentSessionMock = useStudentSession as jest.Mock;

function makeMockReturn(overrides = {}) {
  return {
    lesson: { title: 'Lesson' },
    activeDiscussion: null,
    responseText: '',
    setResponseText: jest.fn(),
    selectedOption: null,
    setSelectedOption: jest.fn(),
    submitAttempted: false,
    setSubmitAttempted: jest.fn(),
    isSubmitCorrect: null,
    feedbackPeriodActive: false,
    submitting: false,
    isConnected: true,
    view: 'active',
    endedMessage: null,
    errorMessage: null,
    canSubmit: false,
    submitResponse: jest.fn(),
    canSubmitAnother: false,
    submitAnotherResponse: jest.fn(),
    ...overrides,
  };
}

describe('Student Session Page (Acceptance)', () => {
  // 12.1
  it('[US 2.09][AT1] success: shows prompt when discussion active', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      activeDiscussion: { status: 'active', prompt_text: 'What is 2+2?' },
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText(/What is 2\+2\?/i)).toBeInTheDocument();
  });

  // 12.2
  it('[US 2.07][AT4] success: shows confirmation after submission', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'submitted',
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
  });

  // 12.3
  it('[US 1.09][AT3][US 2.03][AT4] failure: lesson ended shows ended message', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'ended',
      endedMessage: 'Lesson has ended',
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText(/Lesson ended/i)).toBeInTheDocument();
    expect(screen.getByText(/Lesson has ended/i)).toBeInTheDocument();
  });

  // 12.5
  it('[US 2.15][AT1] success: shows green Active badge when discussion is open', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      activeDiscussion: { id: 'd1', status: 'active', prompt_text: 'What is 2+2?' },
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // 12.6
  it('[US 2.15][AT1] success: shows green Active badge when waiting (no open discussion)', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'waiting',
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
  });

  // 12.7
  it('[US 2.15][AT1] success: shows green Active badge on submitted view', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'submitted',
      activeDiscussion: { id: 'd1', status: 'active', prompt_text: 'Question' },
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
  });

  // 12.8
  it('[US 2.15][AT2] success: shows red Ended badge when lesson has ended', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'ended',
      endedMessage: 'Lesson has ended',
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  // 12.9
  it('[US 2.15][AT3] success: no status badge shown during loading', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      lesson: null,
      isConnected: false,
      view: 'loading',
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
  });

  // 12.4
  it('[US 2.06][AT1] failure: disconnected shows "Connecting…" hint', () => {
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      isConnected: false,
      view: 'waiting',
    }));

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();
  });

  // 12.10
  it('[US 2.10][AT1] success: shows correct feedback for multiple choice', () => {
    const disc = {
      id: 'd1',
      status: 'active',
      prompt_type: 'multiple_choice',
      prompt_text: 'What is 2+2?',
      mc_options: [
        { label: 'A', text: '3' },
        { label: 'B', text: '4' }
      ],
      correct_option: 'B',
      feedback_enabled: true,
    };

    useStudentSessionMock.mockReturnValue(makeMockReturn({
      activeDiscussion: disc,
    }));

    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    // Select option B (Correct)
    fireEvent.click(screen.getByText('B.'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    // Now mock the hook returning 'submitted'
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'submitted',
      activeDiscussion: disc,
      isSubmitCorrect: true, // Selected 'B'
      feedbackPeriodActive: true,
    }));

    rerender(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/Great job/i)).toBeInTheDocument();
  });

  // 12.11
  it('[US 2.10][AT2] success: shows incorrect feedback and correct option when wrong', () => {
    const disc = {
      id: 'd1',
      status: 'active',
      prompt_type: 'multiple_choice',
      prompt_text: 'What is 2+2?',
      mc_options: [
        { label: 'A', text: '3' },
        { label: 'B', text: '4' }
      ],
      correct_option: 'B',
      feedback_enabled: true,
    };

    useStudentSessionMock.mockReturnValue(makeMockReturn({
      activeDiscussion: disc,
    }));

    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    // Select option A (Incorrect)
    fireEvent.click(screen.getByText('A.'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    // Now mock the hook returning 'submitted'
    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'submitted',
      activeDiscussion: disc,
      isSubmitCorrect: false, // Selected 'A'
      feedbackPeriodActive: true,
    }));

    rerender(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/Not quite/i)).toBeInTheDocument();
  });

  // 12.12
  it('[US 2.10][AT3] success: does not show correctness feedback if feedback_enabled is false', () => {
    const disc = {
      id: 'd1',
      status: 'active',
      prompt_type: 'multiple_choice',
      prompt_text: 'What is 2+2?',
      mc_options: [
        { label: 'A', text: '3' },
        { label: 'B', text: '4' }
      ],
      correct_option: 'B',
      feedback_enabled: false, // Feedback disabled
    };

    useStudentSessionMock.mockReturnValue(makeMockReturn({
      activeDiscussion: disc,
    }));

    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    fireEvent.click(screen.getByText('B.'));
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    useStudentSessionMock.mockReturnValue(makeMockReturn({
      view: 'submitted',
      activeDiscussion: disc,
      isSubmitCorrect: true,
      feedbackPeriodActive: true, // even if active, it should be ignored by the component if feedback_enabled is false
    }));

    rerender(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
    expect(screen.queryByText(/Great job/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not quite/i)).not.toBeInTheDocument();
  });
});
