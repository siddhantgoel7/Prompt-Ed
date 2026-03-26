import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase/auth';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/supabase/auth', () => ({
  signUpWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

global.fetch = jest.fn() as jest.Mock;

describe('SignUpForm', () => {
    let mockRouter: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRouter = { push: jest.fn() };
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useSearchParams as jest.Mock).mockReturnValue({ get: jest.fn() });
    });

    it('success: renders all fields', () => {
        render(<SignUpForm />);
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/I agree to the Terms/i)).toBeInTheDocument();
    });

    it('failure: shows error if terms not agreed', async () => {
        render(<SignUpForm />);
        const form = screen.getByRole('button', { name: /Create Account/i }).closest('form');
        fireEvent.submit(form!);
        
        expect(await screen.findByText("You must agree to the Terms and Conditions")).toBeInTheDocument();
    });

    it('failure: shows error for short password', async () => {
        render(<SignUpForm />);
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'j@ualberta.ca' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'short' } });
        fireEvent.click(screen.getByLabelText(/I agree to the Terms/i));

        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
        expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('failure: shows error for non-ualberta email', async () => {
        render(<SignUpForm />);
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'j@gmail.com' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByLabelText(/I agree to the Terms/i));

        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
        expect(await screen.findByText(/You must use a UAlberta email address/i)).toBeInTheDocument();
    });

    it('success: handles successful registration', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({ exists: false })
        });
        (signUpWithEmail as jest.Mock).mockResolvedValue({ error: null });

        render(<SignUpForm />);
        fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@ualberta.ca' } });
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByLabelText(/I agree to the Terms/i));

        fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

        await waitFor(() => {
            expect(screen.getByText(/Check your email/i)).toBeInTheDocument();
        });
    });

    it('success: handles Google signup', async () => {
        (signInWithGoogle as jest.Mock).mockResolvedValue({ error: null });
        render(<SignUpForm />);
        fireEvent.click(screen.getByRole('button', { name: /Google/i }));
        expect(signInWithGoogle).toHaveBeenCalled();
    });
});
