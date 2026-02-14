//[US 1.04] not authorized / not owner → “Not found” view (or redirect behavior if implemented there)

//[US 1.06, 1.31] active lesson → active view shows PIN

//[US 1.09] ended lesson → ended view shows ended status + confirmation

import { render, screen } from '@testing-library/react';
import { SessionPage } from '@/components/instructor/SessionPage';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/hooks/useSessionPage', () => ({
  useSessionPage: jest.fn(),
}));

// Optional: make views stable and easy to assert in tests
jest.mock('@/components/instructor/session/SessionLoading', () => ({
  SessionLoading: () => <div>Loading session…</div>,
}));
jest.mock('@/components/instructor/session/SessionNotFound', () => ({
  SessionNotFound: () => <div>Session not found</div>,
}));
jest.mock('@/components/instructor/session/SessionActiveView', () => ({
  SessionActiveView: ({ vm }: { vm: SessionVM }) => (
    <div>
      <h1>Active Lesson</h1>
      <div>PIN: {vm.lesson.pin_code}</div>
    </div>
  ),
}));
jest.mock('@/components/instructor/session/SessionEndedView', () => ({
  SessionEndedView: () => <div>Lesson ended view</div>,
}));

import { useSessionPage } from '@/hooks/useSessionPage';
const useSessionPageMock = useSessionPage as jest.Mock;

function makeVM(overrides: Partial<SessionVM>): SessionVM {
  // minimal VM contract required by SessionPage routing + our mocked views
  return {
    lesson: {
      id: 'lesson-1',
      title: 'Test Lesson',
      course_id: 'course-1',
      status: 'active',
      pin_code: '123456',
      created_at: new Date().toISOString(),
    } as any,
    loading: false,
    notFound: false,
    isConnected: true,
    discussions: [],
    activeDiscussion: null,
    responses: [],
    promptInput: '',
    setPromptInput: jest.fn() as any,
    displayState: false,
    handleDisplay: jest.fn(),
    endingLesson: false,
    endError: null,
    handleEnd: jest.fn(),
    handlePublishDiscussion: jest.fn(),
    handleCloseDiscussion: jest.fn(),
    historyLoading: false,
    historyError: null,
    lessonDiscussions: [],
    exportingData: false,
    activatingLesson: false,
    handleExportLessonData: jest.fn(),
    handleActivate: jest.fn(),
    ...overrides,
  };
}

describe('Instructor Session Page (Acceptance)', () => {
  it('[US 1.04][AT2] failure: access denied shows not found', () => {
    useSessionPageMock.mockReturnValue(makeVM({ notFound: true }));

    render(<SessionPage lessonId="lesson-456" />);
    expect(screen.getByText(/Session not found/i)).toBeInTheDocument();
  });

  it('[US 1.06][AT1][US 1.31][AT1] success: active lesson shows PIN', () => {
    useSessionPageMock.mockReturnValue(
      makeVM({ lesson: { status: 'active', pin_code: '654321' } as any })
    );

    render(<SessionPage lessonId="lesson-456" />);
    expect(screen.getByText(/Active Lesson/i)).toBeInTheDocument();
    expect(screen.getByText(/PIN:\s*654321/i)).toBeInTheDocument();
  });

  it('[US 1.09][AT1] success: ended lesson shows ended view', () => {
    useSessionPageMock.mockReturnValue(
      makeVM({ lesson: { status: 'ended' } as any })
    );

    render(<SessionPage lessonId="lesson-456" />);
    expect(screen.getByText(/Lesson ended view/i)).toBeInTheDocument();
  });

  it('[US 1.31][AT3] failure: ended lesson is not joinable (ended view shown)', () => {
    useSessionPageMock.mockReturnValue(
      makeVM({ lesson: { status: 'ended', pin_code: '123456' } as any })
    );

    render(<SessionPage lessonId="lesson-456" />);
    expect(screen.getByText(/Lesson ended view/i)).toBeInTheDocument();
  });
});
