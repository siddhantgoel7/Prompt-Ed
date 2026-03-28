import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountPage from '@/app/account/page';
import { useAccount } from '@/hooks/useAccount';

// Mock hook
jest.mock('@/hooks/useAccount', () => ({
  useAccount: jest.fn(),
}));

describe('AccountPage component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'instructor@ualberta.ca',
    user_metadata: { full_name: 'Dr. Test' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    (useAccount as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
      loggingOut: false,
      deleting: false,
      error: null,
      handleLogout: jest.fn(),
      handleDeleteAccount: jest.fn(),
    });

    render(<AccountPage />);
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
  });

  it('renders user details and buttons', () => {
    (useAccount as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      loggingOut: false,
      deleting: false,
      error: null,
      handleLogout: jest.fn(),
      handleDeleteAccount: jest.fn(),
    });

    render(<AccountPage />);
    expect(screen.getByText('Dr. Test')).toBeInTheDocument();
    expect(screen.getByText('instructor@ualberta.ca')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('handles logout button click', () => {
    const mockLogout = jest.fn();
    (useAccount as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      loggingOut: false,
      deleting: false,
      error: null,
      handleLogout: mockLogout,
      handleDeleteAccount: jest.fn(),
    });

    render(<AccountPage />);
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('calls setShowDeleteConfirm when delete button is clicked', () => {
    const mockSetShow = jest.fn();
    (useAccount as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      loggingOut: false,
      deleting: false,
      error: null,
      handleLogout: jest.fn(),
      handleDeleteAccount: jest.fn(),
      setShowDeleteConfirm: mockSetShow,
    });

    render(<AccountPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(mockSetShow).toHaveBeenCalledWith(true);
  });

  it('shows error message if present', () => {
    (useAccount as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      loggingOut: false,
      deleting: false,
      showDeleteConfirm: true,
      error: 'Something went wrong',
      handleLogout: jest.fn(),
      handleDeleteAccount: jest.fn(),
    });

    render(<AccountPage />);
    
    // Error is in ConfirmDeleteDialog
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
