/**
 * Acceptance Tests — [US 1.29] Set a time limit for a response window
 *                   [US 2.11] See how much time a prompt has left to be answered
 *
 * [US 1.29] As an Instructor
 *   I want to set a time limit for a response window
 *   So that I can control how long students have to submit their answers.
 *
 *   AC1: GIVEN instructor creates/publishes discussion WHEN they set a time limit
 *        THEN a countdown timer starts for students
 *   AC2: GIVEN instructor sets time limit THEN the discussion automatically closes when it expires
 *   AC3: GIVEN instructor sets time limit THEN students see the remaining time
 *
 * [US 2.11] As a Student
 *   I want to see how much time a prompt has left to be answered
 *   So that I can pace my response appropriately.
 *
 *   AC1: GIVEN instructor sets time limit WHEN discussion published THEN student sees countdown
 *   AC2: GIVEN timer active THEN it updates in real-time
 *   AC3: GIVEN time expires THEN student sees time's up message and cannot submit
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

// ─── Mock useStudentSession ───────────────────────────────────────────────────
jest.mock('@/hooks/useStudentSession', () => ({
    useStudentSession: jest.fn(),
}));
import { useStudentSession } from '@/hooks/useStudentSession';
const mockHook = useStudentSession as jest.Mock;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_DISCUSSION = {
    id: 'd-timer-1',
    status: 'active' as const,
    prompt_type: 'short_answer' as const,
    prompt_text: 'What is pharmacokinetics?',
    mc_options: null,
    correct_option: null,
    feedback_enabled: false,
    published_at: new Date(Date.now() - 10_000).toISOString(), // published 10s ago
    closed_at: null,
    display_order: 1,
    created_at: new Date().toISOString(),
    lesson_id: 'lesson-1',
    source: null,
    ai_generated_correct_option: null,
    time_limit_seconds: 60,
};

const MC_DISCUSSION_WITH_TIMER = {
    id: 'd-mc-timer-1',
    status: 'active' as const,
    prompt_type: 'multiple_choice' as const,
    prompt_text: 'What does ACE stand for?',
    mc_options: [
        { label: 'A', text: 'Angiotensin Converting Enzyme' },
        { label: 'B', text: 'Acetyl CoA Enzyme' },
        { label: 'C', text: 'Amino Carboxy Ester' },
        { label: 'D', text: 'None of the above' },
    ],
    correct_option: 'A',
    feedback_enabled: true,
    published_at: new Date(Date.now() - 5_000).toISOString(), // published 5s ago
    closed_at: null,
    display_order: 1,
    created_at: new Date().toISOString(),
    lesson_id: 'lesson-1',
    source: null,
    ai_generated_correct_option: null,
    time_limit_seconds: 30,
};

const DISCUSSION_NO_TIMER = {
    ...BASE_DISCUSSION,
    id: 'd-notimer-1',
    time_limit_seconds: null,
    published_at: null,
};

function makeTimerHookValue(overrides: Record<string, unknown> = {}) {
    const endTime = Date.now() + 50_000; // 50 seconds left
    return {
        lesson: { title: 'PMCOL 401' },
        activeDiscussion: BASE_DISCUSSION,
        responseText: '',
        setResponseText: jest.fn(),
        selectedOption: null,
        setSelectedOption: jest.fn(),
        isSubmitCorrect: null,
        setIsSubmitCorrect: jest.fn(),
        submittedAnswerText: null,
        setSubmittedAnswerText: jest.fn(),
        submitting: false,
        isConnected: true,
        view: 'active' as const,
        endedMessage: null,
        errorMessage: null,
        timerEndTime: endTime,
        timerTotalSeconds: 60,
        timerExpired: false,
        canSubmit: true,
        submitResponse: jest.fn(),
        submitAnotherResponse: jest.fn(),
        canSubmitAnother: false,
        responseCount: 0,
        feedbackPeriodActive: false,
        setFeedbackPeriodActive: jest.fn(),
        ...overrides,
    };
}

function makeNoTimerHookValue() {
    return {
        lesson: { title: 'PMCOL 401' },
        activeDiscussion: DISCUSSION_NO_TIMER,
        responseText: '',
        setResponseText: jest.fn(),
        submitting: false,
        isConnected: true,
        view: 'active' as const,
        endedMessage: null,
        errorMessage: null,
        canSubmit: false,
        submitResponse: jest.fn(),
        timerEndTime: null,
        timerTotalSeconds: null,
        timerExpired: false,
    };
}

function makeExpiredHookValue(discussion = BASE_DISCUSSION) {
    return {
        lesson: { title: 'PMCOL 401' },
        activeDiscussion: { ...discussion },
        responseText: '',
        setResponseText: jest.fn(),
        submitting: false,
        isConnected: true,
        view: 'active' as const,
        endedMessage: null,
        errorMessage: null,
        canSubmit: false,
        submitResponse: jest.fn(),
        timerEndTime: Date.now() - 1000, // already expired
        timerTotalSeconds: 60,
        timerExpired: true,
    };
}

function makeSubmittedWithTimerHookValue(timerExpired = false) {
    const endTime = timerExpired ? Date.now() - 1000 : Date.now() + 20_000;
    return {
        ...makeTimerHookValue({
            activeDiscussion: MC_DISCUSSION_WITH_TIMER,
            view: 'submitted' as const,
            timerEndTime: endTime,
            timerTotalSeconds: 30,
            timerExpired,
        }),
    };
}

// ─── US 2.11: AC1 — Student sees timer when time limit is set ─────────────────

describe('[US 2.11] Student Timer Display', () => {
    beforeEach(() => jest.clearAllMocks());

    // 69.1
    it('[US 2.11][AC1-AT1] success: circular timer is rendered when discussion has a time limit', () => {
        mockHook.mockReturnValue(makeTimerHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByTestId('student-timer')).toBeInTheDocument();
    });

    // 69.2
    it('[US 2.11][AC1-AT2] success: timer shows MM:SS format', () => {
        mockHook.mockReturnValue(makeTimerHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        const timer = screen.getByTestId('student-timer');
        // Should contain a time-like string e.g. "00:50"
        expect(timer.textContent).toMatch(/\d{2}:\d{2}/);
    });

    // 69.3
    it('[US 2.11][AC1-AT3] success: no timer shown when discussion has no time limit', () => {
        mockHook.mockReturnValue(makeNoTimerHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByTestId('student-timer')).not.toBeInTheDocument();
    });
});

// ─── US 2.11: AC3 — Time expires → message + cannot submit ───────────────────

describe('[US 2.11] Timer Expired State', () => {
    beforeEach(() => jest.clearAllMocks());

    // 69.4
    it('[US 2.11][AC3-AT1] success: timer expired message shown when timer expires without submission', () => {
        mockHook.mockReturnValue(makeExpiredHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByTestId('timer-expired-message')).toBeInTheDocument();
    });

    // 69.5
    it("[US 2.11][AC3-AT2] success: timer expired message contains Time's up text", () => {
        mockHook.mockReturnValue(makeExpiredHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByText(/Time's up/i)).toBeInTheDocument();
    });

    // 69.6
    it('[US 2.11][AC3-AT3] success: "No answer was submitted" shown in timer expired message', () => {
        mockHook.mockReturnValue(makeExpiredHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByText(/No answer was submitted/i)).toBeInTheDocument();
    });

    // 69.7
    it('[US 2.11][AC3-AT4] failure: submit form is not rendered after timer expires', () => {
        mockHook.mockReturnValue(makeExpiredHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByRole('button', { name: /Submit/i })).not.toBeInTheDocument();
    });

    // 69.8
    it('[US 2.11][AC3-AT5] success: MC with feedback_enabled shows correct answer in expired message', () => {
        mockHook.mockReturnValue(makeExpiredHookValue(MC_DISCUSSION_WITH_TIMER as unknown as typeof BASE_DISCUSSION));
        render(<StudentSessionPage lessonId="lesson-1" />);
        // Text is split by a <span> tag, so check the parent element's full text content
        const expiredMsg = screen.getByTestId('timer-expired-message');
        expect(expiredMsg.textContent).toContain('Correct Answer: A. Angiotensin Converting Enzyme');
    });

    // 69.9
    it('[US 2.11][AC3-AT6] success: MC without feedback_enabled does NOT show correct answer in expired message', () => {
        const disc = { ...MC_DISCUSSION_WITH_TIMER, feedback_enabled: false };
        mockHook.mockReturnValue(makeExpiredHookValue(disc as unknown as typeof BASE_DISCUSSION));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByText(/Correct Answer/i)).not.toBeInTheDocument();
    });
});

// ─── US 2.11: MC feedback shown only after timer expires ─────────────────────

describe('[US 2.11] MC Feedback Timing with Timer', () => {
    beforeEach(() => jest.clearAllMocks());

    // 69.10
    it('[US 2.11][AC3-AT7] success: MC feedback is NOT shown in submitted view while timer is still running', () => {
        mockHook.mockReturnValue(makeSubmittedWithTimerHookValue(false));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByText(/Great job/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Not quite/i)).not.toBeInTheDocument();
    });

    // 69.11
    it("[US 2.11][AC3-AT8] success: submitted state shows 'results will be shown when time's up' while timer running", () => {
        mockHook.mockReturnValue(makeSubmittedWithTimerHookValue(false));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByText(/results will be shown when time/i)).toBeInTheDocument();
    });

    // 69.12
    it('[US 2.11][AC3-AT9] success: MC feedback IS shown in submitted view after timer expires', () => {
        // Simulate correct submission
        const hookVal = makeSubmittedWithTimerHookValue(true);
        mockHook.mockReturnValue(hookVal);
        const { rerender } = render(<StudentSessionPage lessonId="lesson-1" />);

        // Simulate selecting correct option first (sets isSubmitCorrect in component state)
        mockHook.mockReturnValue({
            ...makeTimerHookValue({ activeDiscussion: MC_DISCUSSION_WITH_TIMER }),
        });
        rerender(<StudentSessionPage lessonId="lesson-1" />);
        fireEvent.click(screen.getByText('A.'));
        fireEvent.click(screen.getByRole('button', { name: /Submit response/i }));

        // Now timer expires and view moves to submitted
        mockHook.mockReturnValue({ ...makeSubmittedWithTimerHookValue(true), isSubmitCorrect: true, selectedOption: 'A', feedbackPeriodActive: true });
        rerender(<StudentSessionPage lessonId="lesson-1" />);

        expect(screen.getByText(/Great job/i)).toBeInTheDocument();
    });
});

// ─── US 1.29: Timer broadcasts and discussion data ────────────────────────────

describe('[US 1.29] Instructor Timer — Discussion Data', () => {
    beforeEach(() => jest.clearAllMocks());

    // 69.13
    it('[US 1.29][AC3-AT1] success: timer is displayed to student when time_limit_seconds is set in discussion', () => {
        mockHook.mockReturnValue(makeTimerHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByTestId('student-timer')).toBeInTheDocument();
    });

    // 69.14
    it('[US 1.29][AC3-AT2] success: no timer displayed when time_limit_seconds is null', () => {
        mockHook.mockReturnValue(makeNoTimerHookValue());
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByTestId('student-timer')).not.toBeInTheDocument();
    });
});

// ─── US 2.11: Timer in submitted view ────────────────────────────────────────

describe('[US 2.11] Timer shown in submitted view', () => {
    beforeEach(() => jest.clearAllMocks());

    // 69.15
    it('[US 2.11][AC2-AT1] success: timer is visible in submitted view while timer is still running', () => {
        mockHook.mockReturnValue(makeSubmittedWithTimerHookValue(false));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.getByTestId('student-timer')).toBeInTheDocument();
    });

    // 69.16
    it('[US 2.11][AC2-AT2] success: timer NOT shown in submitted view after timer expires', () => {
        mockHook.mockReturnValue(makeSubmittedWithTimerHookValue(true));
        render(<StudentSessionPage lessonId="lesson-1" />);
        expect(screen.queryByTestId('student-timer')).not.toBeInTheDocument();
    });
});
