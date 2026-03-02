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
      title: 'Ended Lesson',
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

describe('SessionEndedView (Acceptance)', () => {
  // 6.1
  it('[US 1.09][AT1] success: ended header renders', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);
    expect(screen.getByText(/Ended Header:\s*Ended Lesson/i)).toBeInTheDocument();
  });

  // 6.2
  it('[US 1.34][AT1] success: displays preserved discussions and responses in history', () => {
    const vm = makeVM({
      lessonDiscussions: [
        {
          id: 'd1',
          prompt_text: 'What is 2+2?',
          created_at: new Date().toISOString(),
          responses: [
            { id: 'r1', response_text: '4', created_at: new Date().toISOString() },
            { id: 'r2', response_text: 'Four', created_at: new Date().toISOString() },
          ],
        } as any,
      ],
    });

    render(<SessionEndedView vm={vm} />);
    expect(screen.getByText(/Discussions and Responses/i)).toBeInTheDocument();
    expect(screen.getByText(/What is 2\+2\?/i)).toBeInTheDocument();
    expect(screen.getByText(/^4$/)).toBeInTheDocument();
    expect(screen.getByText(/Four/i)).toBeInTheDocument();
  });

  // 6.3
  it('[US 1.09][AT5] failure: historyError is visible', () => {
    const vm = makeVM({ historyError: 'Failed to load history' });
    render(<SessionEndedView vm={vm} />);

    expect(screen.getByText(/Failed to load history/i)).toBeInTheDocument();
  });

  // 6.4
  it('[US 1.09][AT5] state: shows loading message when historyLoading=true', () => {
    const vm = makeVM({ historyLoading: true });
    render(<SessionEndedView vm={vm} />);

    expect(screen.getByText(/Loading lesson history/i)).toBeInTheDocument();
  });

  // 6.5
  it('[US 1.09][AT1] success: clicking Export calls vm.handleExportLessonData', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Export Txt/i }));
    expect(vm.handleExportLessonData).toHaveBeenCalled();
  });

  // 6.6
  it('[US 1.06][AT3] success: clicking Activate calls vm.handleActivate', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Activate/i }));
    expect(vm.handleActivate).toHaveBeenCalled();
  });
});