/**
 * Component Tests — DiscussionTimer
 *
 * Tests the circular countdown timer component used in the student view.
 * Tests rendering, time formatting, warning state, and expiry state.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { DiscussionTimer } from '@/components/student/session/DiscussionTimer';

describe('DiscussionTimer Component [US 2.11]', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // 1
    it('[US 2.11][UNIT1] success: renders with correct initial time display', () => {
        const endTime = Date.now() + 60_000; // 60 seconds
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={60} />);
        const timer = screen.getByTestId('student-timer');
        expect(timer).toBeInTheDocument();
        expect(timer.textContent).toMatch(/01:00|00:5\d/); // ~60 seconds
    });

    // 2
    it('[US 2.11][UNIT2] success: renders MM:SS format', () => {
        const endTime = Date.now() + 90_000; // 1:30
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={90} />);
        expect(screen.getByTestId('student-timer').textContent).toMatch(/\d{2}:\d{2}/);
    });

    // 3
    it('[US 2.11][UNIT3] success: shows 00:00 when time has expired', () => {
        const endTime = Date.now() - 1000; // already expired
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={60} />);
        const timer = screen.getByTestId('student-timer');
        expect(timer.textContent).toContain('00:00');
    });

    // 4
    it("[US 2.11][UNIT4] success: shows 'Time's up' label when expired", () => {
        const endTime = Date.now() - 1000;
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={60} />);
        expect(screen.getByTestId('student-timer').textContent).toMatch(/Time's up/i);
    });

    // 5
    it('[US 2.11][UNIT5] success: has an accessible aria-label describing time remaining', () => {
        const endTime = Date.now() + 30_000;
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={30} />);
        const timer = screen.getByTestId('student-timer');
        expect(timer).toHaveAttribute('aria-label');
        expect(timer.getAttribute('aria-label')).toMatch(/\d{2}:\d{2}/);
    });

    // 6
    it("[US 2.11][UNIT6] success: aria-label says 'Time's up' when expired", () => {
        const endTime = Date.now() - 1000;
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={60} />);
        const timer = screen.getByTestId('student-timer');
        expect(timer.getAttribute('aria-label')).toMatch(/time's up/i);
    });

    // 7
    it('[US 2.11][UNIT7] success: timer label shows "left" when not expired', () => {
        const endTime = Date.now() + 30_000;
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={30} />);
        expect(screen.getByTestId('student-timer').textContent).toMatch(/left/);
    });

    // 8
    it('[US 2.11][UNIT8] success: countdown SVG element is rendered', () => {
        const endTime = Date.now() + 60_000;
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={60} />);
        const timer = screen.getByTestId('student-timer');
        expect(timer.querySelector('svg')).toBeInTheDocument();
    });
});

describe('DiscussionTimer — Countdown Updates [US 2.11]', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    // 9
    it('[US 2.11][UNIT9] success: time decreases as time passes', () => {
        const endTime = Date.now() + 10_000; // 10 seconds
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={10} />);

        const initial = screen.getByTestId('student-timer').textContent;

        act(() => {
            jest.advanceTimersByTime(3000); // advance 3 seconds
        });

        const after = screen.getByTestId('student-timer').textContent;
        // Timer text should have changed (decreased)
        expect(after).not.toEqual(initial);
    });

    // 10
    it('[US 2.11][UNIT10] success: timer shows 00:00 after expiry time passes', () => {
        const endTime = Date.now() + 2_000; // 2 seconds
        render(<DiscussionTimer timerEndTime={endTime} timerTotalSeconds={2} />);

        act(() => {
            jest.advanceTimersByTime(3000); // past expiry
        });

        expect(screen.getByTestId('student-timer').textContent).toContain('00:00');
    });
});
