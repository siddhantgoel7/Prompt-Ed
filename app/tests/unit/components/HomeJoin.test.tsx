import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeJoin } from '@/components/shared/home/HomeJoin';
import { useHomeJoin } from '@/hooks/useHomeJoin';

jest.mock('@/hooks/useHomeJoin', () => ({
  useHomeJoin: jest.fn(),
}));

jest.mock('@/components/ui/AppLogo', () => ({
  AppLogo: ({ size }: any) => <div data-testid="app-logo" data-size={size} />,
}));

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

jest.mock('@/components/ui/LoadingScreen', () => ({
  LoadingScreen: () => <div data-testid="loading-screen" />,
}));

jest.mock('@/components/ui/BlurText', () => ({
  BlurText: ({ text }: any) => <div>{text}</div>,
}));

describe('HomeJoin', () => {
    const mockUseHomeJoin = {
        code: '',
        onChangeCode: jest.fn(),
        join: jest.fn(),
        goSignUp: jest.fn(),
        goLogIn: jest.fn(),
        view: 'join',
        error: null,
        pinOk: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useHomeJoin as jest.Mock).mockReturnValue(mockUseHomeJoin);
    });

    it('success: renders loading screen when checking auth', () => {
        (useHomeJoin as jest.Mock).mockReturnValue({ ...mockUseHomeJoin, view: 'checking-auth' });
        render(<HomeJoin />);
        expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    });

    it('success: renders join form and handles input', () => {
        render(<HomeJoin />);
        
        expect(screen.getByText(/Join a Session/i)).toBeInTheDocument();
        
        const input = screen.getByPlaceholderText('123456');
        fireEvent.change(input, { target: { value: '123456' } });
        
        expect(mockUseHomeJoin.onChangeCode).toHaveBeenCalledWith('123456');
    });

    it('success: calls goLogIn and goSignUp', () => {
        render(<HomeJoin />);
        
        // Header Log in
        fireEvent.click(screen.getAllByText('Log in')[0]);
        expect(mockUseHomeJoin.goLogIn).toHaveBeenCalled();
        
        // Sign up
        fireEvent.click(screen.getByText('Sign up'));
        expect(mockUseHomeJoin.goSignUp).toHaveBeenCalled();
    });

    it('success: displays error message', () => {
        (useHomeJoin as jest.Mock).mockReturnValue({ ...mockUseHomeJoin, error: 'Invalid PIN' });
        render(<HomeJoin />);
        expect(screen.getByText('Invalid PIN')).toBeInTheDocument();
    });

    it('success: handles join button click when PIN is OK', () => {
        (useHomeJoin as jest.Mock).mockReturnValue({ ...mockUseHomeJoin, code: '123456', pinOk: true });
        render(<HomeJoin />);
        
        const joinBtn = screen.getByText('Join Session');
        expect(joinBtn).not.toBeDisabled();
        fireEvent.click(joinBtn);
        expect(mockUseHomeJoin.join).toHaveBeenCalled();
    });

    it('success: disables button and input while joining', () => {
        (useHomeJoin as jest.Mock).mockReturnValue({ ...mockUseHomeJoin, view: 'joining', pinOk: true });
        render(<HomeJoin />);
        
        expect(screen.getByText('Joining…')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('123456')).toBeDisabled();
    });

    it('success: shows correct hint based on code length and pinOk', () => {
        const { rerender } = render(<HomeJoin />);
        expect(screen.getByTestId('pin-hint')).toHaveTextContent('PIN is 6 digits');

        (useHomeJoin as jest.Mock).mockReturnValue({ ...mockUseHomeJoin, code: '123' });
        rerender(<HomeJoin />);
        expect(screen.getByTestId('pin-hint')).toHaveTextContent('Enter exactly 6 digits');

        (useHomeJoin as jest.Mock).mockReturnValue({ ...mockUseHomeJoin, code: '123456', pinOk: true });
        rerender(<HomeJoin />);
        expect(screen.getByTestId('pin-hint')).toHaveTextContent('✓ Looks good');
    });
});
