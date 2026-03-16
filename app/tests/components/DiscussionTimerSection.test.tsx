/**
 * Component Tests — DiscussionTimerSection [US 1.29]
 *
 * Tests the instructor-side timer panel: circular countdown, Edit button,
 * +10s extend button, "No Time Limit" state, and Close Discussion button.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiscussionTimerSection } from '@/components/instructor/session/DiscussionTimerSection';

const DISCUSSION_ID = 'disc-abc';

function renderSection(overrides: Partial<React.ComponentProps<typeof DiscussionTimerSection>> = {}) {
    const endTime = Date.now() + 60_000;
    const defaults: React.ComponentProps<typeof DiscussionTimerSection> = {
        activeDiscussionId: DISCUSSION_ID,
        timerEndTime: endTime,
        timerTotalSeconds: 60,
        onClose: jest.fn(),
        onExtendTimer: jest.fn().mockResolvedValue(undefined),
        onEditTimer: jest.fn().mockResolvedValue(undefined),
    };
    return render(<DiscussionTimerSection {...defaults} {...overrides} />);
}

// ─── Visibility ───────────────────────────────────────────────────────────────

describe('DiscussionTimerSection — Visibility [US 1.29]', () => {
    beforeEach(() => jest.clearAllMocks());

    // 1
    it('[US 1.29][TS-UNIT1] success: renders nothing when no active discussion', () => {
        const { container } = render(
            <DiscussionTimerSection
                activeDiscussionId={null}
                timerEndTime={Date.now() + 60_000}
                timerTotalSeconds={60}
                onClose={jest.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    // 2
    it('[US 1.29][TS-UNIT2] success: renders section when discussion is active', () => {
        renderSection();
        expect(screen.getByTestId('discussion-timer-section')).toBeInTheDocument();
    });

    // 3
    it('[US 1.29][TS-UNIT3] success: circular timer shown when timer is set', () => {
        renderSection();
        expect(screen.getByTestId('instructor-timer')).toBeInTheDocument();
    });

    // 4
    it('[US 1.29][TS-UNIT4] success: "No Time Limit" placeholder shown when no timer', () => {
        renderSection({ timerEndTime: null, timerTotalSeconds: null });
        expect(screen.getByTestId('no-time-limit-label')).toBeInTheDocument();
    });

    // 5
    it('[US 1.29][TS-UNIT5] success: circular timer NOT shown when no timer is set', () => {
        renderSection({ timerEndTime: null, timerTotalSeconds: null });
        expect(screen.queryByTestId('instructor-timer')).not.toBeInTheDocument();
    });
});

// ─── Close Discussion Button ──────────────────────────────────────────────────

describe('DiscussionTimerSection — Close Button [US 1.29]', () => {
    beforeEach(() => jest.clearAllMocks());

    // 6
    it('[US 1.29][TS-UNIT6] success: Close Discussion button is present', () => {
        renderSection();
        expect(screen.getByTestId('close-discussion-button')).toBeInTheDocument();
    });

    // 7
    it('[US 1.29][TS-UNIT7] success: clicking Close Discussion calls onClose with discussion id', () => {
        const onClose = jest.fn();
        renderSection({ onClose });
        fireEvent.click(screen.getByTestId('close-discussion-button'));
        expect(onClose).toHaveBeenCalledWith(DISCUSSION_ID);
    });
});

// ─── Edit Button ──────────────────────────────────────────────────────────────

describe('DiscussionTimerSection — Edit Timer Button [US 1.29]', () => {
    beforeEach(() => jest.clearAllMocks());

    // 8
    it('[US 1.29][TS-UNIT8] success: Edit button is shown when timer is set', () => {
        renderSection();
        expect(screen.getByTestId('edit-timer-button')).toBeInTheDocument();
    });

    // 9
    it('[US 1.29][TS-UNIT9] success: Edit button is NOT shown when no timer is set', () => {
        renderSection({ timerEndTime: null, timerTotalSeconds: null });
        expect(screen.queryByTestId('edit-timer-button')).not.toBeInTheDocument();
    });

    // 10
    it('[US 1.29][TS-UNIT10] success: clicking Edit button opens the timer dialog', () => {
        renderSection();
        fireEvent.click(screen.getByTestId('edit-timer-button'));
        expect(screen.getByText('Set Time Limit')).toBeInTheDocument();
    });

    // 11
    it('[US 1.29][TS-UNIT11] success: dialog confirm button reads "Update Timer" not "Start Discussion"', () => {
        renderSection();
        fireEvent.click(screen.getByTestId('edit-timer-button'));
        expect(screen.getByRole('button', { name: /Update Timer/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Start Discussion/i })).not.toBeInTheDocument();
    });

    // 12
    it('[US 1.29][TS-UNIT12] success: confirming edit with a new value calls onEditTimer with seconds', () => {
        const onEditTimer = jest.fn().mockResolvedValue(undefined);
        renderSection({ onEditTimer });
        fireEvent.click(screen.getByTestId('edit-timer-button'));
        // Change to 2 minutes
        fireEvent.change(screen.getByTestId('timer-minutes'), { target: { value: '2' } });
        fireEvent.change(screen.getByTestId('timer-seconds'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: /Update Timer/i }));
        expect(onEditTimer).toHaveBeenCalledWith(120);
    });

    // 13
    it('[US 1.29][TS-UNIT13] success: confirming edit with "No Time Limit" calls onEditTimer(null)', () => {
        const onEditTimer = jest.fn().mockResolvedValue(undefined);
        renderSection({ onEditTimer });
        fireEvent.click(screen.getByTestId('edit-timer-button'));
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Update Timer/i }));
        expect(onEditTimer).toHaveBeenCalledWith(null);
    });

    // 14
    it('[US 1.29][TS-UNIT14] success: cancelling the edit dialog closes it without calling onEditTimer', () => {
        const onEditTimer = jest.fn();
        renderSection({ onEditTimer });
        fireEvent.click(screen.getByTestId('edit-timer-button'));
        expect(screen.getByText('Set Time Limit')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(screen.queryByText('Set Time Limit')).not.toBeInTheDocument();
        expect(onEditTimer).not.toHaveBeenCalled();
    });

    // 15
    it('[US 1.29][TS-UNIT15] success: edit dialog closes automatically when timer expires while it is open', () => {
        jest.useFakeTimers();
        // Start with 2 seconds left
        const endTime = Date.now() + 2_000;
        renderSection({ timerEndTime: endTime, timerTotalSeconds: 2 });

        // Open the dialog
        fireEvent.click(screen.getByTestId('edit-timer-button'));
        expect(screen.getByText('Set Time Limit')).toBeInTheDocument();

        // Advance past expiry — the component's useEffect should close the dialog
        act(() => {
            jest.advanceTimersByTime(3_000);
        });

        expect(screen.queryByText('Set Time Limit')).not.toBeInTheDocument();
        jest.useRealTimers();
    });
});

// ─── Extend (+10s) Button ─────────────────────────────────────────────────────

describe('DiscussionTimerSection — Extend Timer Button [US 1.29]', () => {
    beforeEach(() => jest.clearAllMocks());

    // 16
    it('[US 1.29][TS-UNIT16] success: +10s button is shown when timer is set', () => {
        renderSection();
        expect(screen.getByTestId('extend-timer-button')).toBeInTheDocument();
    });

    // 17
    it('[US 1.29][TS-UNIT17] success: +10s button is NOT shown when no timer is set', () => {
        renderSection({ timerEndTime: null, timerTotalSeconds: null });
        expect(screen.queryByTestId('extend-timer-button')).not.toBeInTheDocument();
    });

    // 18
    it('[US 1.29][TS-UNIT18] success: clicking +10s button calls onExtendTimer with 10', () => {
        const onExtendTimer = jest.fn().mockResolvedValue(undefined);
        renderSection({ onExtendTimer });
        fireEvent.click(screen.getByTestId('extend-timer-button'));
        expect(onExtendTimer).toHaveBeenCalledWith(10);
    });

    // 19
    it('[US 1.29][TS-UNIT19] success: +10s button does not open any dialog', () => {
        renderSection();
        fireEvent.click(screen.getByTestId('extend-timer-button'));
        expect(screen.queryByText('Set Time Limit')).not.toBeInTheDocument();
    });
});

// ─── Timer display ────────────────────────────────────────────────────────────

describe('DiscussionTimerSection — Timer Display [US 1.29]', () => {
    beforeEach(() => jest.clearAllMocks());

    // 20
    it('[US 1.29][TS-UNIT20] success: timer displays MM:SS format', () => {
        renderSection();
        const timer = screen.getByTestId('instructor-timer');
        expect(timer.textContent).toMatch(/\d{2}:\d{2}/);
    });

    // 21
    it('[US 1.29][TS-UNIT21] success: timer shows "remaining" label when time is left', () => {
        renderSection();
        expect(screen.getByText('remaining')).toBeInTheDocument();
    });

    // 22
    it('[US 1.29][TS-UNIT22] success: timer shows "Time expired" when remaining is 0', () => {
        renderSection({ timerEndTime: Date.now() - 1000, timerTotalSeconds: 60 });
        expect(screen.getByText('Time expired')).toBeInTheDocument();
    });
});
