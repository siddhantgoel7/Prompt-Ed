/**
 * Component Tests — StudentSessionPage (Multiple Responses)
 * User Story [US 1.30]: Allow multiple responses from students
 *
 * These tests verify StudentSessionPage behaviour for the three acceptance criteria:
 *
 * AC1: GIVEN an instructor WHEN they configure response limit
 *      THEN students are limited to that number of submissions
 * AC2: GIVEN an instructor WHEN they allow multiple responses
 *      THEN students can submit more than once
 * AC3: GIVEN an instructor WHEN they allow single response
 *      THEN students can only submit once
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

const mockLesson = {
    id: 'lesson-1',
    title: 'Pharmacology 101',
    course_id: 'course-1',
    date_created: new Date().toISOString(),
    created_at: new Date().toISOString(),
    pin_code: '123456',
    status: 'active' as const,
    started_at: new Date().toISOString(),
    ended_at: null,
};

const mockDiscussionBase: Discussion = {
    id: 'd-multi-1',
    lesson_id: 'lesson-1',
    prompt_text: 'Explain the mechanism of action of aspirin.',
    prompt_type: 'short_answer',
    status: 'active',
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    closed_at: null,
    display_order: 0,
    source: 'manual',
    mc_options: null,
    correct_option: null,
    feedback_enabled: false,
    ai_generated_correct_option: null,
    participant_snapshot: 25,
    time_limit_seconds: null,
    allow_multiple_responses: false,
    response_limit: 1,
};

const baseHookReturn = {
    lesson: mockLesson,
    activeDiscussion: mockDiscussionBase,
    responseText: '',
    setResponseText: jest.fn(),
    submitting: false,
    endedMessage: null,
    errorMessage: null,
    canSubmit: false,
    submitResponse: jest.fn(),
    isConnected: true,
    view: 'submitted' as const,
    timerEndTime: null,
    timerTotalSeconds: null,
    timerExpired: false,
    submitAnotherResponse: jest.fn(),
    canSubmitAnother: false,
    responseCount: 1,
};

describe('StudentSessionPage Multiple Responses [US 1.30]', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── AC3: Single response (default) ──────────────────────────────────

    describe('AC3: Single response — students can only submit once', () => {

        // 72.1
        it('[US 1.30][CT1] success: does not show Submit Another Response button when allow_multiple_responses is false', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: false, response_limit: 1 },
                canSubmitAnother: false,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });

        // 72.2
        it('[US 1.30][CT2] success: shows submitted answer display after single submission', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: false },
                canSubmitAnother: false,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            // In submitted view for open-ended questions, the prompt card is shown (no "Submit Another" button)
            expect(screen.getByText(mockDiscussionBase.prompt_text)).toBeInTheDocument();
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });

        // 72.3
        it('[US 1.30][CT3] failure: Submit Another Response button absent for MC questions even with allow_multiple_responses', () => {
            const mcDiscussion: Discussion = {
                ...mockDiscussionBase,
                prompt_type: 'multiple_choice',
                mc_options: [
                    { label: 'A', text: 'Option A' },
                    { label: 'B', text: 'Option B' },
                    { label: 'C', text: 'Option C' },
                    { label: 'D', text: 'Option D' },
                ],
                correct_option: 'A',
                allow_multiple_responses: true,
                response_limit: null,
            };
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: mcDiscussion,
                canSubmitAnother: false,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });
    });

    // ── AC2: Multiple responses allowed ─────────────────────────────────

    describe('AC2: Multiple responses — students can submit more than once', () => {

        // 72.4
        it('[US 1.30][CT4] success: shows Submit Another Response button when canSubmitAnother is true', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: null },
                canSubmitAnother: true,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.getByTestId('submit-another-response-button')).toBeInTheDocument();
        });

        // 72.5
        it('[US 1.30][CT5] success: Submit Another Response button text does not include counter when no limit', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: null },
                canSubmitAnother: true,
                responseCount: 2,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            const button = screen.getByTestId('submit-another-response-button');
            expect(button.textContent).toBe('Submit Another Response');
        });

        // 72.6
        it('[US 1.30][CT6] success: shows Submit Another Response on long_answer questions too', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, prompt_type: 'long_answer', allow_multiple_responses: true, response_limit: null },
                canSubmitAnother: true,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.getByTestId('submit-another-response-button')).toBeInTheDocument();
        });

        // 72.7
        it('[US 1.30][CT7] success: Submit Another Response button is visible alongside prompt card in submitted view', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: null },
                canSubmitAnother: true,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.getByTestId('submit-another-response-button')).toBeInTheDocument();
            expect(screen.getByText(mockDiscussionBase.prompt_text)).toBeInTheDocument();
        });
    });

    // ── AC1: Response limit enforcement ─────────────────────────────────

    describe('AC1: Response limit — students are limited to configured number of submissions', () => {

        // 72.8
        it('[US 1.30][CT8] success: shows response count progress when limit is set (e.g. 1/3)', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: 3 },
                canSubmitAnother: true,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            const button = screen.getByTestId('submit-another-response-button');
            expect(button.textContent).toContain('(1/3)');
        });

        // 72.9
        it('[US 1.30][CT9] success: shows updated count after multiple submissions (e.g. 2/5)', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: 5 },
                canSubmitAnother: true,
                responseCount: 2,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            const button = screen.getByTestId('submit-another-response-button');
            expect(button.textContent).toContain('(2/5)');
        });

        // 72.10
        it('[US 1.30][CT10] success: hides Submit Another Response when response limit is reached', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: 3 },
                canSubmitAnother: false,
                responseCount: 3,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });

        // 72.11
        it('[US 1.30][CT11] success: shows prompt card without button when limit exhausted', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: 2 },
                canSubmitAnother: false,
                responseCount: 2,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.getByText(mockDiscussionBase.prompt_text)).toBeInTheDocument();
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });
    });

    // ── Edge cases ──────────────────────────────────────────────────────

    describe('Edge cases', () => {

        // 72.12
        it('[US 1.30][CT12] failure: does not show Submit Another Response when discussion is closed', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: null, status: 'closed' },
                canSubmitAnother: false,
                responseCount: 1,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });

        // 72.13
        it('[US 1.30][CT13] success: Submit Another Response visible with timer running', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: { ...mockDiscussionBase, allow_multiple_responses: true, response_limit: null },
                canSubmitAnother: true,
                responseCount: 1,
                timerEndTime: Date.now() + 60000,
                timerTotalSeconds: 120,
                timerExpired: false,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.getByTestId('submit-another-response-button')).toBeInTheDocument();
        });

        // 72.14
        it('[US 1.30][CT14] failure: does not show Submit Another Response when activeDiscussion is null', () => {
            mockUseStudentSession.mockReturnValue({
                ...baseHookReturn,
                activeDiscussion: null,
                canSubmitAnother: false,
                responseCount: 0,
            });
            render(<StudentSessionPage lessonId="lesson-1" />);
            expect(screen.queryByTestId('submit-another-response-button')).not.toBeInTheDocument();
        });
    });
});
