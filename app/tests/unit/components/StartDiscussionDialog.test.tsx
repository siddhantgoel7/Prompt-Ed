import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartDiscussionDialog } from '@/components/instructor/session/StartDiscussionDialog';

// Mock Dialog
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog-root">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Mock Tooltip
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock Button
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

describe('StartDiscussionDialog', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with default values (1 min)', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        
        expect(screen.getByTestId('timer-minutes')).toHaveValue(1);
        expect(screen.getByTestId('timer-seconds')).toHaveValue(0);
        expect(screen.getByRole('checkbox', { name: 'No Time Limit' })).toHaveAttribute('aria-checked', 'false');
    });

    it('handles time changes within bounds', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        
        const minInput = screen.getByTestId('timer-minutes');
        const secInput = screen.getByTestId('timer-seconds');

        fireEvent.change(minInput, { target: { value: '5' } });
        fireEvent.change(secInput, { target: { value: '30' } });

        expect(minInput).toHaveValue(5);
        expect(secInput).toHaveValue(30);

        fireEvent.click(screen.getByText('Start Discussion'));
        expect(onConfirm).toHaveBeenCalledWith(5 * 60 + 30);
    });

    it('enforces min/max bounds (0-59)', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        const minInput = screen.getByTestId('timer-minutes');

        fireEvent.change(minInput, { target: { value: '65' } });
        expect(minInput).toHaveValue(59);

        fireEvent.change(minInput, { target: { value: '-10' } });
        expect(minInput).toHaveValue(0);
    });

    it('handles "No Time Limit" toggle', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        const checkbox = screen.getByTestId('no-time-limit-checkbox');

        fireEvent.click(checkbox);
        expect(checkbox).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('timer-minutes')).toBeDisabled();

        fireEvent.click(screen.getByText('Start Discussion'));
        expect(onConfirm).toHaveBeenCalledWith(null);
    });

    it('keyboard support for checkbox', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        const checkbox = screen.getByTestId('no-time-limit-checkbox');

        fireEvent.keyDown(checkbox, { key: 'Enter' });
        expect(checkbox).toHaveAttribute('aria-checked', 'true');

        fireEvent.keyDown(checkbox, { key: ' ' }); // Space
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    it('disables confirm button if timer is 0 and noLimit is false', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        
        fireEvent.change(screen.getByTestId('timer-minutes'), { target: { value: '0' } });
        fireEvent.change(screen.getByTestId('timer-seconds'), { target: { value: '0' } });

        expect(screen.getByText('Start Discussion')).toBeDisabled();
        expect(screen.getByText(/Timer must be at least 1 second/)).toBeInTheDocument();
    });

    it('calls onCancel', () => {
        render(<StartDiscussionDialog open={true} onConfirm={onConfirm} onCancel={onCancel} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalled();
    });
});
