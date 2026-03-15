// tests/acceptance/student_session_page.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
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

  // 12.5
  it('[US 2.15][AT1] success: shows green Active badge when discussion is open', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: { id: 'd1', status: 'active', prompt_text: 'What is 2+2?' },
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
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  // 12.6
  it('[US 2.15][AT1] success: shows green Active badge when waiting (no open discussion)', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: null,
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: true,
      view: 'waiting',
      endedMessage: null,
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
  });

  // 12.7
  it('[US 2.15][AT1] success: shows green Active badge on submitted view', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: { id: 'd1', status: 'active', prompt_text: 'Question' },
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
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
  });

  // 12.8
  it('[US 2.15][AT2] success: shows red Ended badge when lesson has ended', () => {
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
    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  // 12.9
  it('[US 2.15][AT3] success: no status badge shown during loading', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: null,
      activeDiscussion: null,
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: false,
      view: 'loading',
      endedMessage: null,
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    render(<StudentSessionPage lessonId="lesson-1" />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
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

  // 12.10
  it('[US 2.10][AT1] success: shows correct feedback for multiple choice', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: {
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
      },
      responseText: '',
      setResponseText: jest.fn(),
      submitting: false,
      isConnected: true,
      view: 'active', // initially active to allow selection
      endedMessage: null,
      errorMessage: null,
      canSubmit: false,
      submitResponse: jest.fn(),
    });

    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    // Select option B (Correct)
    fireEvent.click(screen.getByText('B.'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    // Now mock the hook returning 'submitted'
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: {
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
      },
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

    rerender(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/✅ Correct!/i)).toBeInTheDocument();
    expect(screen.getByText(/You selected the correct answer/i)).toBeInTheDocument();
  });

  // 12.11
  it('[US 2.10][AT2] success: shows incorrect feedback and correct option when wrong', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: {
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
      },
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

    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    // Select option A (Incorrect)
    fireEvent.click(screen.getByText('A.'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    // Now mock the hook returning 'submitted'
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: {
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
      },
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

    rerender(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/❌ Incorrect/i)).toBeInTheDocument();
    expect(screen.getByText(/Correct Answer: B\. 4/i)).toBeInTheDocument();
  });

  // 12.12
  it('[US 2.10][AT3] success: does not show correctness feedback if feedback_enabled is false', () => {
    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: {
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
      },
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

    const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

    fireEvent.click(screen.getByText('B.'));
    fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

    useStudentSessionMock.mockReturnValue({
      lesson: { title: 'Lesson' },
      activeDiscussion: {
        id: 'd1',
        status: 'active',
        prompt_type: 'multiple_choice',
        prompt_text: 'What is 2+2?',
        mc_options: [
          { label: 'A', text: '3' },
          { label: 'B', text: '4' }
        ],
        correct_option: 'B',
        feedback_enabled: false,
      },
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

    rerender(<StudentSessionPage lessonId="lesson-1" />);

    expect(screen.getByText(/Response submitted/i)).toBeInTheDocument();
    expect(screen.queryByText(/✅ Correct!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/❌ Incorrect/i)).not.toBeInTheDocument();
  });
});
