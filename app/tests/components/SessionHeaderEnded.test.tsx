import { fireEvent, render, screen } from '@testing-library/react';
import { SessionHeaderEnded } from '@/components/instructor/session/SessionHeaderEnded';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: (props: any) => <button {...props} />,
}));

describe('SessionHeaderEnded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 56.1
  it('routes back to lessons page when Back to Lessons is clicked', () => {
    render(
      <SessionHeaderEnded
        title="Ended Lesson"
        courseId="course-123"
        exporting={false}
        activating={false}
        onExportOverviewTxt={jest.fn()}
        onExportDiscussionsCsv={jest.fn()}
        onExportStatistics={jest.fn()}
        onActivate={jest.fn()}
        onSplitView={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Back to Lessons/i }));
    expect(mockPush).toHaveBeenCalledWith('/lessons_page/course-123');
  });

  // 56.2
  it('uses onBackToLessons override when provided', () => {
    const onBackToLessons = jest.fn();

    render(
      <SessionHeaderEnded
        title="Ended Lesson"
        courseId="course-123"
        exporting={false}
        activating={false}
        onExportOverviewTxt={jest.fn()}
        onExportDiscussionsCsv={jest.fn()}
        onExportStatistics={jest.fn()}
        onActivate={jest.fn()}
        onBackToLessons={onBackToLessons}
        onSplitView={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Back to Lessons/i }));
    expect(onBackToLessons).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
