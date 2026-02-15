import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { signInWithEmail, signInWithGoogle } from '@/lib/supabase/auth';

jest.mock('@/lib/supabase/auth', () => ({
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Auth (Acceptance) - LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 2.1
  it('[US 1.02][AT1] success: email/password login redirects instructor to dashboard', async () => {
    (signInWithEmail as jest.Mock).mockResolvedValue({ error: null });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@ualberta.ca' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'good-password' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith('test@ualberta.ca', 'good-password');
      expect(mockPush).toHaveBeenCalledWith('/instructor_dashboard');
    });
  });

  // 2.2
  it('[US 1.02][AT2] failure: invalid email/password shows error and remains logged out', async () => {
    (signInWithEmail as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'bad@ualberta.ca' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid login credentials/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // 2.3
  it('[US 1.02][AT1] success: clicking "Continue with Google" triggers SSO handler', async () => {
    (signInWithGoogle as jest.Mock).mockResolvedValue({ error: null });

    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(signInWithGoogle).toHaveBeenCalled();
    });

    // For OAuth, app usually redirects externally; no router.push expected here.
    expect(mockPush).not.toHaveBeenCalledWith('/instructor_dashboard');
  });

  // 2.4
  it('[US 1.02][AT2] failure: Google SSO failure shows error and remains logged out', async () => {
    (signInWithGoogle as jest.Mock).mockResolvedValue({
      error: { message: 'SSO failed' },
    });

    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    expect(await screen.findByText(/SSO failed/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  // 2.5
  it('[US 1.01][AT1] success: clicking "Sign Up" navigates to account creation page', async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/create_instructor');
    });
  });
});