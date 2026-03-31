import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { InstructorDashboardHeader } from '@/components/instructor/InstructorDashboardHeader';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/components/ui/AppLogo', () => ({
    AppLogo: () => <div data-testid="app-logo" />,
}));

jest.mock('@/components/ui/ThemeToggle', () => ({
    ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

describe('InstructorDashboardHeader', () => {
    const mockPush = jest.fn();
    const props = {
        onLogout: jest.fn(),
        loggingOut: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    });

    it('renders logo, theme toggle and account button', () => {
        render(<InstructorDashboardHeader {...props} />);
        
        expect(screen.getByTestId('app-logo')).toBeInTheDocument();
        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('navigates to /account when clicking account button', () => {
        render(<InstructorDashboardHeader {...props} />);
        const accountBtn = screen.getByText('Account');
        
        fireEvent.click(accountBtn);
        expect(mockPush).toHaveBeenCalledWith('/account');
    });

    it('triggers onLogout when clicking logout button', () => {
        render(<InstructorDashboardHeader {...props} />);
        const logoutBtn = screen.getByText('Logout');
        
        fireEvent.click(logoutBtn);
        expect(props.onLogout).toHaveBeenCalled();
    });

    it('shows Logging Out... when loggingOut is true', () => {
        render(<InstructorDashboardHeader {...props} loggingOut={true} />);
        expect(screen.getByText('Logging Out...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Logging Out/i })).toBeDisabled();
    });

    it('does not show logout button if onLogout is not provided', () => {
        render(<InstructorDashboardHeader loggingOut={false} />);
        expect(screen.queryByText('Logout')).not.toBeInTheDocument();
        expect(screen.queryByText('Logging Out...')).not.toBeInTheDocument();
    });

    it('handles mouse enter/leave on account button', () => {
        render(<InstructorDashboardHeader {...props} />);
        const btn = screen.getByText('Account');

        fireEvent.mouseEnter(btn);
        expect(btn).toHaveStyle('border-color: var(--color-primary-400)');
        expect(btn).toHaveStyle('color: var(--color-primary-500)');

        fireEvent.mouseLeave(btn);
        expect(btn).toHaveStyle('border-color: var(--border-default)');
        expect(btn).toHaveStyle('color: var(--text-secondary)');
    });
});
