import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { JoinCodeOverlay } from '@/components/instructor/session/JoinCodeOverlay';
import { SessionContext } from '@/components/instructor/session/SessionContext';

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => open ? <div data-testid="dialog" onClick={() => onOpenChange(false)}>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

describe('JoinCodeOverlay', () => {
    it('success: renders code when open', () => {
        render(<JoinCodeOverlay open={true} code="123456" onClose={jest.fn()} />);
        expect(screen.getByText('123456')).toBeInTheDocument();
        expect(screen.getByText('Join Code')).toBeInTheDocument();
    });

    it('success: returns null if no code', () => {
        const { container } = render(<JoinCodeOverlay open={true} code={null} onClose={jest.fn()} />);
        expect(container.firstChild).toBeNull();
    });

    it('success: uses context if provided', () => {
        const mockContext = {
            displayState: true,
            lesson: { pin_code: '654321' },
            handleDisplay: jest.fn(),
        } as any;

        render(
            <SessionContext.Provider value={mockContext}>
                <JoinCodeOverlay />
            </SessionContext.Provider>
        );

        expect(screen.getByText('654321')).toBeInTheDocument();
        
        // Test close
        fireEvent.click(screen.getByTestId('dialog'));
        expect(mockContext.handleDisplay).toHaveBeenCalled();
    });

    it('success: calls onClose prop when no context', () => {
        const onClose = jest.fn();
        render(<JoinCodeOverlay open={true} code="111222" onClose={onClose} />);
        fireEvent.click(screen.getByTestId('dialog'));
        expect(onClose).toHaveBeenCalled();
    });
});
