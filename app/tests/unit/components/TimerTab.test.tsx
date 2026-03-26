import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimerTab } from '@/components/instructor/session/TimerTab';

jest.mock('@/components/ui/CircularTimer', () => ({
    CircularTimer: () => <div data-testid="circular-timer" />,
}));

jest.mock('@/components/instructor/session/StartDiscussionDialog', () => ({
    StartDiscussionDialog: ({ open, onConfirm }: any) => open ? (
        <div data-testid="edit-dialog">
            <button onClick={() => onConfirm(20)}>Confirm 20s</button>
        </div>
    ) : null,
}));

jest.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: any) => <div>{children}</div>,
    TooltipTrigger: ({ children }: any) => <div>{children}</div>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

describe('TimerTab', () => {
    const defaultProps = {
        activeDiscussionId: 'd1',
        timerEndTime: Date.now() + 30000,
        timerTotalSeconds: 30,
        onClose: jest.fn(),
        onExtendTimer: jest.fn(),
        onEditTimer: jest.fn(),
    };

    it('success: renders and handles timer controls', () => {
        render(<TimerTab {...defaultProps} />);
        expect(screen.getByTestId('circular-timer')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('edit-timer-button'));
        expect(screen.getByTestId('edit-dialog')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Confirm 20s'));
        expect(defaultProps.onEditTimer).toHaveBeenCalledWith(20);

        fireEvent.click(screen.getByTestId('extend-timer-button'));
        expect(defaultProps.onExtendTimer).toHaveBeenCalledWith(10);

        fireEvent.click(screen.getByTestId('close-discussion-button'));
        expect(defaultProps.onClose).toHaveBeenCalledWith('d1');
    });

    it('success: renders no-time-limit state', () => {
        render(<TimerTab {...defaultProps} timerEndTime={null} timerTotalSeconds={null} />);
        expect(screen.getByTestId('no-time-limit-label')).toBeInTheDocument();
        expect(screen.queryByTestId('circular-timer')).not.toBeInTheDocument();
    });

    it('success: empty state when no active discussion', () => {
        render(<TimerTab {...defaultProps} activeDiscussionId={null} />);
        expect(screen.getByText(/No active discussion/i)).toBeInTheDocument();
    });
});
