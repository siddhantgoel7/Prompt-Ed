import { render, screen, waitFor } from '@testing-library/react';
import QRCode from 'qrcode';
import { SessionDisplayView } from '@/components/instructor/session/SessionDisplayView';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,display-fake'),
  },
}));

describe('SessionDisplayView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders lesson title, pin, and QR for direct student join URL', async () => {
    render(
      <SessionDisplayView
        lessonId="lesson-xyz"
        title="Pharmacology 301"
        pinCode="654321"
      />
    );

    expect(screen.getByText(/Pharmacology 301/i)).toBeInTheDocument();
    expect(screen.getByText(/654321/i)).toBeInTheDocument();

    await waitFor(() => {
      expect((QRCode as any).toDataURL).toHaveBeenCalledWith(
        'http://localhost/student/lesson-xyz',
        expect.objectContaining({ width: 520, margin: 1 })
      );
    });

    expect(screen.getByText('http://localhost/student/lesson-xyz')).toBeInTheDocument();
    expect(screen.getByAltText(/join lesson qr code/i)).toBeInTheDocument();
  });
});
