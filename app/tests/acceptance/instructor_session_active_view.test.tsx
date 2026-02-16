import { render, screen, fireEvent } from '@testing-library/react';
import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import type { SessionVM } from '@/hooks/useSessionPage';

jest.mock('@/components/instructor/session/SessionHeaderActive', () => ({
  SessionHeaderActive: (props: any) => (
    <div>
      <div>Title: {props.title}</div>
      <div>PIN: {props.pinCode}</div>
      <button onClick={props.onDisplay}>Display</button>
      <button onClick={props.onEnd}>End</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/session/JoinCodeOverlay', () => ({
  JoinCodeOverlay: (props: any) =>
    props.open ? (
      <div>
        <div>Join Code Overlay</div>
        <div>CODE: {props.code}</div>
        <button onClick={props.onClose}>Close Overlay</button>
      </div>
    ) : null,
}));

jest.mock('@/components/instructor/session/ActiveSidebar', () => ({
  ActiveSidebar: () => <div>Sidebar</div>,
}));

jest.mock('@/components/instructor/session/ActiveRightPanel', () => ({
  ActiveRightPanel: (props: any) => <div>RightPanel count={props.responses?.length ?? 0}</div>,
}));

jest.mock('@/components/instructor/session/ActiveCenter', () => ({
  ActiveCenter: (props: any) => (
    <div>
      <div>Center</div>
      <div>connected={String(props.isConnected)}</div>
      <div>activeDiscussionId={String(props.activeDiscussionId)}</div>
      <input
        aria-label="Prompt"
        value={props.promptInput}
        onChange={(e) => props.setPromptInput(e.target.value)}
      />
      <button onClick={props.onPublish}>Publish</button>
      <button onClick={props.onClose}>Close</button>
    </div>
  ),
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

describe('SessionActiveView (Acceptance)', () => {
  // 5.1
  it('[US 1.31][AT1][US 1.06][AT4] success: PIN is visible in active header', () => {
    const vm = makeVM({ lesson: { pin_code: '654321', title: 'Active Lesson' } as any });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/Title:\s*Active Lesson/i)).toBeInTheDocument();
    expect(screen.getByText(/PIN:\s*654321/i)).toBeInTheDocument();
  });

  // 5.2
  it('[US 1.31][AT1] success: display overlay shows join code when displayState=true', () => {
    const vm = makeVM({ displayState: true, lesson: { pin_code: '999999' } as any });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/Join Code Overlay/i)).toBeInTheDocument();
    expect(screen.getByText(/CODE:\s*999999/i)).toBeInTheDocument();
  });

  // 5.3
  it('[US 1.31][AT1] success: closing overlay calls handleDisplay (toggles off)', () => {
    const vm = makeVM({ displayState: true });
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Close Overlay/i }));
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

    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'My prompt' } });
    expect(vm.setPromptInput).toHaveBeenCalledWith('My prompt');

    fireEvent.click(screen.getByRole('button', { name: /Publish/i }));
    expect(vm.handlePublishDiscussion).toHaveBeenCalled();
  });

  // 5.6
  it('[US 1.28][AT2] success: clicking Close calls handler', () => {
    const vm = makeVM();
    render(<SessionActiveView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(vm.handleCloseDiscussion).toHaveBeenCalled();
  });

  // 5.7
  it('[US 1.09][AT5] failure/signal: endError renders visibly', () => {
    const vm = makeVM({ endError: 'Failed to end lesson' });
    render(<SessionActiveView vm={vm} />);

    expect(screen.getByText(/Failed to end lesson/i)).toBeInTheDocument();
  });
});