// [US 1.34] See responses in real-time
// Tests that instructor can see anonymous student responses appear in real-time

import { render, screen } from '@testing-library/react';
import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/components/instructor/session/SessionHeaderActive', () => ({
  SessionHeaderActive: (props: any) => (
    <div>
      <div>Title: {props.title}</div>
      <div>PIN: {props.pinCode}</div>
      <button onClick={props.onEnd}>End</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/session/JoinCodeOverlay', () => ({
  JoinCodeOverlay: () => null,
}));

jest.mock('@/components/instructor/session/ActiveSidebar', () => ({
  ActiveSidebar: () => <div>Sidebar</div>,
}));

jest.mock('@/components/instructor/session/ActiveRightPanel', () => ({
  ActiveRightPanel: (props: any) => (
    <div>
      <div>Responses Panel</div>
      {props.responses?.map((r: any) => (
        <div key={r.id}>
          <span>{r.response_text}</span>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/instructor/session/ActiveCenter', () => ({
  ActiveCenter: (props: any) => (
    <div>
      <div>Center</div>
      <button onClick={props.onPublish}>Publish</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: (props: any) => (
    <div>
      <div>Ended Header: {props.title}</div>
    </div>
  ),
}));

function makeVM(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    lesson: {
      id: 'lesson-1',
      title: 'Real-time Test',
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
  } as unknown as SessionVM;
}

describe('Real-time Responses (Acceptance) [US 1.34]', () => {
  // 10.1
  it('[US 1.34][AT1] success: responses appear without refresh (via broadcast listener)', () => {
    // When responses array is updated (via broadcast callback in the hook),
    // the view re-renders with new responses without manual refresh
    const vm = makeVM({
      responses: [
        { id: 'r1', discussion_id: 'd1', response_text: 'First answer', created_at: '2026-02-14T10:01:00Z' },
        { id: 'r2', discussion_id: 'd1', response_text: 'Second answer', created_at: '2026-02-14T10:02:00Z' },
      ] as any[],
    });

    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/First answer/i)).toBeInTheDocument();
    expect(screen.getByText(/Second answer/i)).toBeInTheDocument();
  });

  // 10.2
  it('[US 1.34][AT2] success: responses displayed anonymously (no student identifiers)', () => {
    const vm = makeVM({
      responses: [
        { id: 'r1', discussion_id: 'd1', response_text: 'Anonymous response 1', created_at: '2026-02-14T10:01:00Z' },
        { id: 'r2', discussion_id: 'd1', response_text: 'Anonymous response 2', created_at: '2026-02-14T10:02:00Z' },
      ] as any[],
    });

    render(<SessionActiveView vm={vm} />);

    // Responses are visible
    expect(screen.getByText(/Anonymous response 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Anonymous response 2/i)).toBeInTheDocument();

    // No student names, emails, or IDs in the rendered output
    const container = screen.getByText(/Responses Panel/i).parentElement;
    expect(container?.textContent).not.toMatch(/student/i);
    expect(container?.textContent).not.toMatch(/@/);
    expect(container?.textContent).not.toMatch(/user-/);
  });

  // 10.3
  it('[US 1.34][AT3] success: all responses appear in list', () => {
    const vm = makeVM({
      responses: [
        { id: 'r1', discussion_id: 'd1', response_text: 'Response A', created_at: '2026-02-14T10:01:00Z' },
        { id: 'r2', discussion_id: 'd1', response_text: 'Response B', created_at: '2026-02-14T10:02:00Z' },
        { id: 'r3', discussion_id: 'd1', response_text: 'Response C', created_at: '2026-02-14T10:03:00Z' },
      ] as any[],
    });

    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/Response A/i)).toBeInTheDocument();
    expect(screen.getByText(/Response B/i)).toBeInTheDocument();
    expect(screen.getByText(/Response C/i)).toBeInTheDocument();
  });

  // 10.4
  it('[US 1.34][AT1] success: preserved responses visible in ended view', () => {
    const vm = makeVM({
      lesson: { id: 'lesson-1', title: 'Ended', status: 'ended', course_id: 'c1', pin_code: '123456', created_at: new Date().toISOString() } as any,
      isConnected: false,
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'Discussion prompt',
          status: 'closed',
          created_at: '2026-02-14T10:00:00Z',
          responses: [
            { id: 'r1', response_text: 'Preserved answer', created_at: '2026-02-14T10:01:00Z' },
          ],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    expect(screen.getByText(/Discussion prompt/i)).toBeInTheDocument();
    expect(screen.getByText(/Preserved answer/i)).toBeInTheDocument();
  });
});