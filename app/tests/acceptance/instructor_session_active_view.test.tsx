import { render, screen, fireEvent } from '@testing-library/react';
import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/components/instructor/session/SessionHeaderActive', () => ({
  SessionHeaderActive: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
    return (
      <div>
        <div>Title: {vm.lesson.title}</div>
        <div>PIN: {vm.lesson.pin_code}</div>
        <button onClick={vm.handleDisplay}>Display</button>
        <button onClick={vm.handleEnd}>End</button>
        <button onClick={props.onSplitView}>Split View</button>
      </div>
    );
  },
}));

jest.mock('@/components/instructor/session/SplitView', () => ({
  SplitView: (props: any) => (
    <div>
      <div>Split View Overlay</div>
      <button onClick={props.onBack}>Back to Session</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/session/ActiveSidebar', () => ({
  ActiveSidebar: () => <div>Sidebar</div>,
}));

jest.mock('@/components/instructor/session/ConnectionStatus', () => ({
  ConnectionStatus: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
    return (
      <div>
        <div>Connection: {vm.isConnected ? 'connected' : 'disconnected'}</div>
        <button onClick={vm.handleReconnect}>Reconnect</button>
      </div>
    );
  },
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
        <div>connected={String(vm.isConnected)}</div>
        <div>activeDiscussionId={String(vm.activeDiscussion?.id ?? null)}</div>
        <input
          aria-label="Prompt"
          value={vm.promptInput}
          onChange={(e) => vm.setPromptInput(e.target.value)}
        />
        <button onClick={vm.handlePublishDiscussion}>Publish</button>
        <button onClick={vm.handleCloseDiscussion}>Close</button>
      </div>
    );
  },
}));

function makeVM(overrides: Partial<SessionVM> = {}): SessionVM {
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
    handleReconnect: jest.fn(),
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

describe('SessionActiveView (Acceptance)', () => {
  // 5.1
  it('[US 1.31][AT1][US 1.06][AT4] success: PIN is visible in active header', () => {
    const vm = makeVM({ lesson: { pin_code: '654321', title: 'Active Lesson' } as any });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/Title:\s*Active Lesson/i)).toBeInTheDocument();
    expect(screen.getByText(/PIN:\s*654321/i)).toBeInTheDocument();
  });

  // 5.2
  it('[US 1.31][AT1] success: clicking Display calls vm.handleDisplay', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Display/i }));
    expect(vm.handleDisplay).toHaveBeenCalled();
  });

  // 5.4
  it('[US 1.09][AT1] success: clicking End calls vm.handleEnd', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /End/i }));
    expect(vm.handleEnd).toHaveBeenCalled();
  });

  // 5.5
  it('[US 1.21][AT1][US 1.28][AT1] success: prompt input updates via setPromptInput and publish calls handler', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    fireEvent.change(screen.getAllByLabelText('Prompt')[0], { target: { value: 'My prompt' } });
    expect(vm.setPromptInput).toHaveBeenCalledWith('My prompt');

    fireEvent.click(screen.getAllByRole('button', { name: /Publish/i })[0]);
    expect(vm.handlePublishDiscussion).toHaveBeenCalled();
  });

  // 5.6
  it('[US 1.28][AT2] success: clicking Close calls handler', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Close/i })[0]);
    expect(vm.handleCloseDiscussion).toHaveBeenCalled();
  });

  // 5.7
  it('[US 1.09][AT5] failure/signal: endError renders visibly', () => {
    const vm = makeVM({ endError: 'Failed to end lesson' });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/Failed to end lesson/i)).toBeInTheDocument();
  });

  // 5.8
  it('success: clicking Split View button opens the split view overlay', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Split View/i }));

    expect(screen.getByText('Split View Overlay')).toBeInTheDocument();
    // Normal session content should not be visible
    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
  });

  // 5.9
  it('success: clicking Back to Session in split view returns to normal view', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    // Enter split view
    fireEvent.click(screen.getByRole('button', { name: /Split View/i }));
    expect(screen.getByText('Split View Overlay')).toBeInTheDocument();

    // Exit split view
    fireEvent.click(screen.getByRole('button', { name: /Back to Session/i }));
    expect(screen.queryByText('Split View Overlay')).not.toBeInTheDocument();
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
  });

  // 5.10
  it('success: shows connected status when isConnected=true', () => {
    const vm = makeVM({ isConnected: true });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText('Connection: connected')).toBeInTheDocument();
  });

  // 5.11
  it('success: shows disconnected status when isConnected=false', () => {
    const vm = makeVM({ isConnected: false });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText('Connection: disconnected')).toBeInTheDocument();
  });

  // 5.12
  it('success: clicking Reconnect calls vm.handleReconnect', () => {
    const vm = makeVM({ isConnected: false });
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Reconnect/i }));
    expect(vm.handleReconnect).toHaveBeenCalled();
  });
});
