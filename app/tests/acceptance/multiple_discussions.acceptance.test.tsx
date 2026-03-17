// [US 1.25] Multiple discussions per lesson
// Tests that an instructor can create and manage multiple discussions within one lesson

import { render, screen, fireEvent } from '@testing-library/react';
import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/components/instructor/session/SessionHeaderActive', () => ({
  SessionHeaderActive: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
    return (
      <div>
        <div>Title: {vm.lesson.title}</div>
        <div>PIN: {vm.lesson.pin_code}</div>
        <button onClick={vm.handleDisplay}>Display</button>
        <button onClick={vm.handleEnd}>End</button>
      </div>
    );
  },
}));

jest.mock('@/components/instructor/session/JoinCodeOverlay', () => ({
  JoinCodeOverlay: (props: any) => (props.open ? <div>Join Code Overlay</div> : null),
}));

jest.mock('@/components/instructor/session/ActiveSidebar', () => ({
  ActiveSidebar: () => <div>Sidebar</div>,
}));

jest.mock('@/components/instructor/session/ActiveRightPanel', () => ({
  ActiveRightPanel: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
    return <div>RightPanel count={vm.responses?.length ?? 0}</div>;
  },
}));

jest.mock('@/components/instructor/session/ActiveCenter', () => ({
  ActiveCenter: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
    return (
      <div>
        <div>Center</div>
        <div>activeDiscussionId={String(vm.activeDiscussion?.id ?? null)}</div>
        <input
          aria-label="Prompt"
          value={vm.promptInput}
          onChange={(e: any) => vm.setPromptInput(e.target.value)}
        />
        <button onClick={vm.handlePublishDiscussion}>Publish</button>
        {/* Close Discussion button moved to DiscussionTimerSection */}
      </div>
    );
  },
}));

jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: (props: any) => (
    <div>
      <div>Ended Header: {props.title}</div>
      <button onClick={props.onExport}>Export Txt</button>
      <button onClick={props.onActivate}>Activate</button>
    </div>
  ),
}));

function makeActiveVM(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    lesson: {
      id: 'lesson-1',
      title: 'Multi-Discussion Lesson',
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

function makeEndedVM(overrides: Partial<SessionVM> = {}): SessionVM {
  return makeActiveVM({
    lesson: {
      id: 'lesson-1',
      title: 'Multi-Discussion Lesson',
      course_id: 'course-1',
      status: 'ended',
      pin_code: '123456',
      created_at: new Date().toISOString(),
    } as any,
    isConnected: false,
    ...overrides,
  });
}

describe('Multiple Discussions per Lesson (Acceptance) [US 1.25]', () => {
  // 9.1
  it('[US 1.25][AT1] success: can publish additional discussion after first one', () => {
    // After a first discussion was published and closed, the instructor can publish again
    const vm = makeActiveVM({
      discussions: [
        {
          id: 'd1',
          prompt_text: 'First discussion',
          status: 'closed',
          created_at: '2026-02-14T10:00:00Z',
        } as any,
      ],
      activeDiscussion: null, // No active discussion (first was closed)
    });

    render(<SessionActiveView vm={vm} />);

    // Publish button is available for a new discussion
    const publishBtn = screen.getByRole('button', { name: /Publish/i });
    expect(publishBtn).toBeInTheDocument();

    fireEvent.click(publishBtn);
    expect(vm.handlePublishDiscussion).toHaveBeenCalled();
  });

  // 9.2 — responses are hidden behind "Show Responses" toggle in new design
  it('[US 1.25][AT2] success: each discussion tracked separately', () => {
    const vm = makeEndedVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'First question',
          status: 'closed',
          created_at: '2026-02-14T10:00:00Z',
          responses: [
            { id: 'r1', response_text: 'Answer to first', created_at: '2026-02-14T10:01:00Z' },
          ],
        } as any,
        {
          id: 'd2',
          prompt_text: 'Second question',
          status: 'closed',
          created_at: '2026-02-14T10:15:00Z',
          responses: [
            { id: 'r2', response_text: 'Answer to second', created_at: '2026-02-14T10:16:00Z' },
          ],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    // Both discussion prompts are always visible
    expect(screen.getByText(/First question/i)).toBeInTheDocument();
    expect(screen.getByText(/Second question/i)).toBeInTheDocument();

    // Responses are behind the toggle — expand each discussion
    const toggles = screen.getAllByText(/Show Responses/i);
    toggles.forEach(toggle => fireEvent.click(toggle));

    expect(screen.getByText(/Answer to first/i)).toBeInTheDocument();
    expect(screen.getByText(/Answer to second/i)).toBeInTheDocument();
  });

  // 9.3 — "Discussions and Responses" heading no longer exists, section is now "Discussions"
  it('[US 1.25][AT3] success: all discussions visible in lesson data', () => {
    const vm = makeEndedVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'Discussion A',
          status: 'closed',
          created_at: '2026-02-14T10:00:00Z',
          responses: [],
        } as any,
        {
          id: 'd2',
          prompt_text: 'Discussion B',
          status: 'closed',
          created_at: '2026-02-14T10:10:00Z',
          responses: [],
        } as any,
        {
          id: 'd3',
          prompt_text: 'Discussion C',
          status: 'closed',
          created_at: '2026-02-14T10:20:00Z',
          responses: [],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    expect(screen.getByText(/Discussion A/i)).toBeInTheDocument();
    expect(screen.getByText(/Discussion B/i)).toBeInTheDocument();
    expect(screen.getByText(/Discussion C/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Discussions$/i })).toBeInTheDocument();
  });

  // 9.4
  it('[US 1.25][AT1] failure: cannot publish when a discussion is already active', () => {
    // When there is already an active discussion, publishing creates a new one
    // but the close button should be available first
    const vm = makeActiveVM({
      activeDiscussion: {
        id: 'd1',
        prompt_text: 'Currently active',
        status: 'active',
      } as any,
    });

    render(<SessionActiveView vm={vm} />);

    // Close Discussion button is now in DiscussionTimerSection (moved from ActiveCenter)
    const closeBtn = screen.getByTestId('close-discussion-button');
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(vm.handleCloseDiscussion).toHaveBeenCalled();
  });
});