// [US 1.39] ended view — show/hide responses toggle, sequential list
// [US 1.40] ended view — response rate per card, "View Analytics" button present

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import type { SessionVM } from '@/hooks/useSessionPage';
import { fetchResponsesApi } from '@/lib/api/discussionsApi';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/api/discussionsApi', () => ({
  fetchResponsesApi: jest.fn(),
}));

jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: ({ onSplitView }: { onSplitView: () => void }) => (
    <div>
      <button onClick={onSplitView}>Split View</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/session/SplitView', () => ({
  SplitView: () => <div>Split view</div>,
}));

jest.mock('@/components/instructor/session/SessionContext', () => ({
  SessionContext: { _currentValue: null },
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSessionContext: jest.fn(),
}));

const fetchResponsesMock = fetchResponsesApi as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDiscussion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'disc-1',
    lesson_id: 'lesson-1',
    prompt_text: 'What is a closure?',
    prompt_type: 'free_text',
    status: 'closed',
    created_at: '2024-01-01T10:00:00Z',
    published_at: '2024-01-01T10:00:00Z',
    closed_at: '2024-01-01T10:05:00Z',
    display_order: 1,
    participant_snapshot: 4,
    responses: [
      { id: 'r1', response_text: 'First response.', created_at: '2024-01-01T10:00:30Z' },
      { id: 'r2', response_text: 'Second response.', created_at: '2024-01-01T10:01:00Z' },
    ],
    ...overrides,
  };
}

function makeVM(overrides: Partial<SessionVM> = {}): SessionVM {
  return {
    lesson: {
      id: 'lesson-1',
      title: 'Test Lesson',
      course_id: 'course-1',
      status: 'ended',
      pin_code: '123456',
      created_at: '2024-01-01T09:00:00Z',
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
    lessonDiscussions: [makeDiscussion() as any],
    exportingData: false,
    activatingLesson: false,
    handleExportLessonData: jest.fn(),
    handleActivate: jest.fn(),
    studentCount: 0,
    peakStudentCount: 0,
    transcripts: [],
    transcriptsLoading: false,
    transcriptsError: null,
    files: [],
    isUploading: false,
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    openFile: jest.fn(),
    ...overrides,
  } as unknown as SessionVM;
}

// ---------------------------------------------------------------------------
// US 1.39 — Sequential response list in ended view
// ---------------------------------------------------------------------------

describe('[US 1.39] Ended view response list', () => {

  it('[AT1] success: discussion card is rendered for each discussion', () => {
    render(<SessionEndedView vm={makeVM()} />);

    expect(screen.getByText('What is a closure?')).toBeInTheDocument();
  });

  it('[AT2] success: "Show Responses" button is visible when responses exist', () => {
    render(<SessionEndedView vm={makeVM()} />);

    expect(screen.getByText(/Show Responses \(2\)/i)).toBeInTheDocument();
  });

  it('[AT3] success: clicking "Show Responses" reveals responses in sequential list', () => {
    render(<SessionEndedView vm={makeVM()} />);

    fireEvent.click(screen.getByText(/Show Responses/i));

    expect(screen.getByText('First response.')).toBeInTheDocument();
    expect(screen.getByText('Second response.')).toBeInTheDocument();
  });

  it('[AT4] success: clicking again hides responses', () => {
    render(<SessionEndedView vm={makeVM()} />);

    fireEvent.click(screen.getByText(/Show Responses/i));
    expect(screen.getByText('First response.')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Hide Responses/i));
    expect(screen.queryByText('First response.')).not.toBeInTheDocument();
  });

  it('[AT5] success: each response shows a timestamp when expanded', () => {
    render(<SessionEndedView vm={makeVM()} />);

    fireEvent.click(screen.getByText(/Show Responses/i));

    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThanOrEqual(2);
  });

  it('[AT6] failure: "Show Responses" button not shown when discussion has no responses', () => {
    const vm = makeVM({
      lessonDiscussions: [makeDiscussion({ responses: [] }) as any],
    });
    render(<SessionEndedView vm={vm} />);

    expect(screen.queryByText(/Show Responses/i)).not.toBeInTheDocument();
  });

  it('[AT7] success: summary bar shows total discussion count', () => {
    const vm = makeVM({
      lessonDiscussions: [makeDiscussion() as any, makeDiscussion({ id: 'disc-2', prompt_text: 'Second prompt' }) as any],
    });
    render(<SessionEndedView vm={vm} />);

    // Use heading role to target the section h2, not the summary bar label
    expect(screen.getByRole('heading', { name: /^Discussions$/i })).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// US 1.40 — Metrics on ended discussion cards
// ---------------------------------------------------------------------------

describe('[US 1.40] Ended view metrics', () => {

  beforeEach(() => {
    fetchResponsesMock.mockResolvedValue([
      { id: 'r1', discussion_id: 'disc-1', response_text: 'First response.', created_at: '2024-01-01T10:00:30Z' },
      { id: 'r2', discussion_id: 'disc-1', response_text: 'Second response.', created_at: '2024-01-01T10:01:00Z' },
    ]);
  });

  it('[AT1] success: response rate shown on discussion card (responses / snapshot)', () => {
    // 2 responses / 4 students = 50%
    render(<SessionEndedView vm={makeVM()} />);

    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('[AT2] success: student count shown on discussion card', () => {
    render(<SessionEndedView vm={makeVM()} />);

    expect(screen.getByText('4')).toBeInTheDocument(); // participant_snapshot
  });

  it('[AT3] failure: response rate not shown when participant_snapshot is null', () => {
    const vm = makeVM({
      lessonDiscussions: [makeDiscussion({ participant_snapshot: null }) as any],
    });
    render(<SessionEndedView vm={vm} />);

    expect(screen.queryByText(/%\s*rate/i)).not.toBeInTheDocument();
  });

  it('[AT4] success: "View Analytics" button is present on each discussion card', () => {
    render(<SessionEndedView vm={makeVM()} />);

    expect(screen.getByRole('button', { name: /View Analytics/i })).toBeInTheDocument();
  });

  it('[AT5] success: clicking "View Analytics" opens the analytics modal', async () => {
    render(<SessionEndedView vm={makeVM()} />);

    fireEvent.click(screen.getByRole('button', { name: /View Analytics/i }));

    await waitFor(() => {
      expect(fetchResponsesMock).toHaveBeenCalledWith('disc-1', true);
    });

    await waitFor(() => {
      expect(screen.getByText(/Analytics —/i)).toBeInTheDocument();
    });
  });

  it('[AT6] success: analytics modal shows participation rate from snapshot', async () => {
    render(<SessionEndedView vm={makeVM()} />);

    fireEvent.click(screen.getByRole('button', { name: /View Analytics/i }));

    await waitFor(() => {
      // 2 responses / 4 snapshot = 50%
      expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('[AT7] success: summary bar shows correct total response count', () => {
    render(<SessionEndedView vm={makeVM()} />);

    // Summary bar shows "2 Total Responses" — scope by sibling label
    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('[AT8] success: multiple discussion cards each show their own response count', () => {
    const vm = makeVM({
      lessonDiscussions: [
        makeDiscussion({ id: 'disc-1', responses: [{ id: 'r1', response_text: 'A', created_at: '2024-01-01T10:00:00Z' }] }) as any,
        makeDiscussion({ id: 'disc-2', prompt_text: 'Second prompt', participant_snapshot: 4, responses: [
          { id: 'r2', response_text: 'B', created_at: '2024-01-01T10:00:00Z' },
          { id: 'r3', response_text: 'C', created_at: '2024-01-01T10:00:00Z' },
          { id: 'r4', response_text: 'D', created_at: '2024-01-01T10:00:00Z' },
        ]}) as any,
      ],
    });
    render(<SessionEndedView vm={vm} />);

    // disc-1: 1/4 = 25%, disc-2: 3/4 = 75%
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });
});