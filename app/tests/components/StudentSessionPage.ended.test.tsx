/**
 * Component Tests — StudentSessionPage (Lesson Ended Notification)
 * User Story [US 2.12]: Lesson ended notification for students
 *
 * These tests verify StudentSessionPage behaviour when a lesson ends:
 * - Shows "Lesson ended" alert when view is 'ended'
 * - Shows the ended message from the instructor
 * - Shows red Ended badge when lesson has ended
 * - Does not show Active badge when lesson has ended
 * - Shows default ended message when no custom message provided
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useStudentSession');
import { useStudentSession } from '@/hooks/useStudentSession';
const mockUseStudentSession = useStudentSession as jest.MockedFunction<typeof useStudentSession>;

const baseHookReturn = {
  lesson: {
    id: 'lesson-1',
    title: 'Pharmacology 101',
    course_id: 'course-1',
    date_created: new Date().toISOString(),
    created_at: new Date().toISOString(),
    pin_code: '123456',
    status: 'ended' as const,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
  },
  activeDiscussion: null,
  responseText: '',
  setResponseText: jest.fn(),
  submitting: false,
  endedMessage: null,
  errorMessage: null,
  canSubmit: false,
  submitResponse: jest.fn(),
  isConnected: false,
  view: 'ended' as const,
  timerEndTime: null,
  timerTotalSeconds: null,
  timerExpired: false,
};

describe('StudentSessionPage Lesson Ended Notification Tests [US 2.12]', () => {

  describe('Ended alert', () => {

    // 46.1
    it('[US 2.12][CT1] success: shows Lesson ended alert title when view is ended', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        endedMessage: 'Lesson has ended',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText(/lesson ended/i)).toBeInTheDocument();
    });

    // 46.2
    it('[US 2.12][CT2] success: shows custom ended message from instructor', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        endedMessage: 'Thanks for participating!',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText('Thanks for participating!')).toBeInTheDocument();
    });

    // 46.3
    it('[US 2.12][CT3] success: shows default message when endedMessage is null', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        endedMessage: null,
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText(/lesson has ended/i)).toBeInTheDocument();
    });

    // 46.4
    it('[US 2.12][CT4] failure: does not show ended alert when view is active', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        view: 'waiting',
        endedMessage: null,
        isConnected: true,
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.queryByText(/lesson ended/i)).not.toBeInTheDocument();
    });
  });

  describe('Ended badge', () => {

    // 46.5
    it('[US 2.12][CT5] success: shows red Ended badge when lesson has ended', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        endedMessage: 'Lesson has ended',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.getByText('Ended')).toBeInTheDocument();
    });

    // 46.6
    it('[US 2.12][CT6] success: does not show Active badge when lesson has ended', () => {
      mockUseStudentSession.mockReturnValue({
        ...baseHookReturn,
        endedMessage: 'Lesson has ended',
      });
      render(<StudentSessionPage lessonId="lesson-1" />);
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });
  });
});