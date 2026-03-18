import { render, screen, waitFor } from '@testing-library/react';
import { SessionHeaderActive } from '@/components/instructor/session/SessionHeaderActive';
import QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,fake'),
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: (props: any) => <button {...props} />,
}));

describe('SessionHeaderActive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encodes a direct student lesson URL in QR code (not homepage root)', async () => {
    render(
      <SessionHeaderActive
        title="Lesson"
        lessonId="lesson-123"
        pinCode="123456"
        endingLesson={false}
        onDisplay={jest.fn()}
        onEnd={jest.fn()}
        onSplitView={jest.fn()}
      />
    );

    await waitFor(() => {
      expect((QRCode as any).toDataURL).toHaveBeenCalledWith(
        'http://localhost/student/lesson-123',
        expect.objectContaining({ width: 96, margin: 1 })
      );
    });

    const link = screen.getByRole('link', { name: /open student lesson link/i });
    expect(link).toHaveAttribute('href', 'http://localhost/student/lesson-123');
  });
});
