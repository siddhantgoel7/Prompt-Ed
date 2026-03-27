/**
 * Tests for SessionDisplayView component.
 * Covers: joinUrl present (homepageUrl shown) vs null, pinCode present vs null,
 * qrDataUrl present (img rendered) vs null (placeholder shown).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SessionDisplayView } from '@/components/instructor/session/SessionDisplayView';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseStudentJoinQR = jest.fn();
jest.mock('@/hooks/useStudentJoinQR', () => ({
  useStudentJoinQR: (...args: any[]) => mockUseStudentJoinQR(...args),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SessionDisplayView', () => {
  beforeEach(() => {
    mockUseStudentJoinQR.mockReturnValue({ joinUrl: null, qrDataUrl: null });
  });

  it('renders the lesson title', () => {
    render(<SessionDisplayView lessonId="l1" title="Pharmacology 101" pinCode="123456" />);
    expect(screen.getByText('Pharmacology 101')).toBeInTheDocument();
  });

  it('shows the PIN code when provided', () => {
    render(<SessionDisplayView lessonId="l1" title="Pharm" pinCode="654321" />);
    expect(screen.getByText('654321')).toBeInTheDocument();
  });

  it('shows "------" placeholder when pinCode is null', () => {
    render(<SessionDisplayView lessonId="l1" title="Pharm" pinCode={null} />);
    expect(screen.getByText('------')).toBeInTheDocument();
  });

  it('shows homepage URL when joinUrl is available', () => {
    mockUseStudentJoinQR.mockReturnValue({
      joinUrl: 'https://app.example.com/join/l1',
      qrDataUrl: null,
    });
    render(<SessionDisplayView lessonId="l1" title="Pharm" pinCode="123" />);
    expect(screen.getByText('https://app.example.com')).toBeInTheDocument();
  });

  it('does not show homepage URL when joinUrl is null', () => {
    mockUseStudentJoinQR.mockReturnValue({ joinUrl: null, qrDataUrl: null });
    render(<SessionDisplayView lessonId="l1" title="Pharm" pinCode="123" />);
    expect(screen.queryByText(/https:\/\//)).not.toBeInTheDocument();
  });

  it('renders the QR code img when qrDataUrl is available', () => {
    mockUseStudentJoinQR.mockReturnValue({
      joinUrl: null,
      qrDataUrl: 'data:image/png;base64,abc123',
    });
    render(<SessionDisplayView lessonId="l1" title="Pharm" pinCode="123" />);
    const qr = screen.getByAltText('Join lesson QR code');
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,abc123');
  });

  it('shows "Generating QR..." placeholder when qrDataUrl is null', () => {
    mockUseStudentJoinQR.mockReturnValue({ joinUrl: null, qrDataUrl: null });
    render(<SessionDisplayView lessonId="l1" title="Pharm" pinCode="123" />);
    expect(screen.getByText('Generating QR...')).toBeInTheDocument();
  });
});
