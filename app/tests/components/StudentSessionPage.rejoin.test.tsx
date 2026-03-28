/**
 * Component Tests — StudentSessionPage (Rejoin)
 * User Story [US 2.14]: Rejoin a lesson as a student
 *
 * These tests verify StudentSessionPage behaviour when a student rejoins:
 * - Shows "Connecting…" alert when disconnected
 * - Hides "Connecting…" alert when reconnected
 * - Active prompt is visible after rejoin
 * - Submit is disabled while disconnected
 * - Submit is enabled after rejoin
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';
import type { Discussion } from '@/types/discussion';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useStudentSession');
import { useStudentSession } from '@/hooks/useStudentSession';
const mockUseStudentSession = useStudentSession as jest.MockedFunction<typeof useStudentSession>;

const mockActiveDiscussion: Discussion = {
  id: 'd1',
  lesson_id: 'lesson-1',
  prompt_text: 'What is the mechanism of action of aspirin?',
  prompt_type: 'short_answer',
  status: 'active',
  created_at: new Date().toISOString(),
  published_at: null,
  closed_at: null,
  display_order: 1,
  source: null,
  mc_options: null,
  correct_option: null,
  feedback_enabled: false,
  ai_generated_correct_option: null,
  participant_snapshot: 0,
  time_limit_seconds: null,
  allow_multiple_responses: false,
  response_limit: 1,
};

const baseHookReturn = {
  lesson: {
    id: 'lesson-1',
    title: 'Pharmacology 101',
    course_id: 'course-1',
    date_created: new Date().toISOString(),
    created_at: new Date().toISOString(),
    pin_code: '123456',
    status: 'active' as const,
    started_at: new Date().toISOString(),
    ended_at: null,
  },
  activeDiscussion: null,
  responseText: '',
  setResponseText: jest.fn(),
  submitting: false,
  endedMessage: null,
  errorMessage: null,
  canSubmit: false,
  submitResponse: jest.fn(),
  timerEndTime: null,
  timerTotalSeconds: null,
  timerExpired: false,
  submitAnotherResponse: jest.fn(),
  canSubmitAnother: false,
  responseCount: 0,
};

describe('StudentSessionPage Rejoin Tests [US 2.14]', () => {

  describe('Disconnected state', () => {

    // 45.5
    it('[US 2.14][CT1] success: shows Connecting alert when isConnected is false', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: false,
        view: 'waiting',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    // 45.6
    it('[US 2.14][CT2] success: shows Connecting alert with descriptive message', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: false,
        view: 'waiting',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText(/trying to establish realtime updates/i)).toBeInTheDocument();
    });

    // 45.7
    it('[US 2.14][CT3] success: submit is disabled while disconnected with active discussion', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: false,
        view: 'active',
        activeDiscussion: mockActiveDiscussion,
        responseText: 'Some answer',
        canSubmit: false,
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Rejoined state', () => {

    // 45.8
    it('[US 2.14][CT4] success: does not show Connecting alert when rejoined', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: true,
        view: 'waiting',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
    });

    // 45.9
    it('[US 2.14][CT5] success: active prompt is visible after rejoin', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: true,
        view: 'active',
        activeDiscussion: mockActiveDiscussion,
        canSubmit: true,
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText('What is the mechanism of action of aspirin?')).toBeInTheDocument();
    });

    // 45.10
    it('[US 2.14][CT6] success: submit is enabled after rejoin with response text', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: true,
        view: 'active',
        activeDiscussion: mockActiveDiscussion,
        responseText: 'Inhibits COX enzymes',
        canSubmit: true,
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      const submitButton = screen.getByRole('button', { name: /submit/i });
      expect(submitButton).not.toBeDisabled();
    });

    // 45.11
    it('[US 2.14][CT7] success: waiting view shown after rejoin with no active discussion', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        isConnected: true,
        view: 'waiting',
        activeDiscussion: null,
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.queryByText(/connecting/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/trying to establish realtime updates/i)).not.toBeInTheDocument();
    });
  });
});