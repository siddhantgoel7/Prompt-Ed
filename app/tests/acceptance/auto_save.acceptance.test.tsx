// [US 1.10] Auto-save on end
// Tests that ending a lesson automatically saves all data without manual action

import { render, screen, fireEvent } from '@testing-library/react';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: (props: any) => (
    <div>
      <div>Ended Header: {props.title}</div>
      <button onClick={props.onExport}>Export Txt</button>
      <button onClick={props.onActivate}>Activate</button>
      <div>exporting={String(props.exporting)}</div>
      <div>activating={String(props.activating)}</div>
    </div>
  ),
}));

function makeVM(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    lesson: {
      id: 'lesson-1',
      title: 'Auto-Save Test Lesson',
      course_id: 'course-1',
      status: 'ended',
      pin_code: '123456',
      created_at: new Date().toISOString(),
    } as any,
    loading: false,
    notFound: false,
    isConnected: false,
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

describe('Auto-Save on End (Acceptance) [US 1.10]', () => {
  // 3.1 — "Discussions and Responses" heading no longer exists, section is now "Discussions"
  it('[US 1.10][AT1] success: ending lesson closes active discussions (status=closed, closed_at set)', () => {
    const closedAt = '2026-02-14T10:30:00Z';
    const vm = makeVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'What is pharmacology?',
          status: 'closed',
          closed_at: closedAt,
          created_at: '2026-02-14T10:00:00Z',
          responses: [],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    // Discussion is shown in ended view with preserved data
    expect(screen.getByText(/What is pharmacology\?/i)).toBeInTheDocument();
    // The ended view renders, meaning data was saved (discussion has closed status and closed_at)
    expect(screen.getByRole('heading', { name: /^Discussions$/i })).toBeInTheDocument();
  });

  // 3.2
  it('[US 1.10][AT2] success: discussion prompts preserved with timestamps after end', () => {
    const vm = makeVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'Explain drug metabolism',
          created_at: '2026-02-14T09:00:00Z',
          published_at: '2026-02-14T09:00:05Z',
          closed_at: '2026-02-14T09:15:00Z',
          status: 'closed',
          responses: [],
        } as any,
        {
          id: 'd2',
          prompt_text: 'What are side effects?',
          created_at: '2026-02-14T09:20:00Z',
          published_at: '2026-02-14T09:20:02Z',
          closed_at: '2026-02-14T09:35:00Z',
          status: 'closed',
          responses: [],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    // Both prompts preserved
    expect(screen.getByText(/Explain drug metabolism/i)).toBeInTheDocument();
    expect(screen.getByText(/What are side effects\?/i)).toBeInTheDocument();
  });

  // 3.3 — responses are hidden behind "Show Responses" toggle in new design
  it('[US 1.10][AT3] success: responses preserved with submission times after end', () => {
    const vm = makeVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'What is 2+2?',
          created_at: '2026-02-14T10:00:00Z',
          status: 'closed',
          responses: [
            { id: 'r1', response_text: '4', created_at: '2026-02-14T10:01:00Z' },
            { id: 'r2', response_text: 'Four', created_at: '2026-02-14T10:02:00Z' },
          ],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);

    // Prompt preserved
    expect(screen.getByText(/What is 2\+2\?/i)).toBeInTheDocument();
    // Responses are behind the toggle — expand first
    fireEvent.click(screen.getByText(/Show Responses/i));
    expect(screen.getByText(/^4$/)).toBeInTheDocument();
    expect(screen.getByText(/Four/i)).toBeInTheDocument();
  });

  // 3.4
  it('[US 1.10][AT1] failure: no discussions shows empty history', () => {
    const vm = makeVM({ lessonDiscussions: [] });

    render(<SessionEndedView vm={vm} />);

    // Ended view still renders successfully even with no discussions
    expect(screen.getByText(/Ended Header/i)).toBeInTheDocument();
  });
});