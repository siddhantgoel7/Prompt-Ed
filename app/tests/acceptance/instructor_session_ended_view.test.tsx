import { render, screen, fireEvent } from '@testing-library/react';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import type { SessionVM } from '@/hooks/useSessionPage';
import userEvent from '@testing-library/user-event';


jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
    return (
      <div>
        <div>Ended Header: {vm.lesson.title}</div>
        <button onClick={vm.handleExportOverviewTxt}>Export Overview TXT</button>
        <button onClick={vm.handleExportDiscussionsCsv}>Export Discussions CSV</button>
        <button onClick={vm.handleExportStatistics}>Export Statistics</button>
        <button onClick={vm.handleActivate}>Activate</button>
        <button onClick={props.onSplitView}>Split View</button>
        <div>exporting={String(vm.exportingData)}</div>
        <div>activating={String(vm.activatingLesson)}</div>
      </div>
    );
  },
}));

jest.mock('@/components/instructor/session/SplitView', () => ({
  SplitView: (props: any) => (
    <div>
      <div>Split View Overlay</div>
      <div>Discussions: {props.discussions.length}</div>
      <button onClick={props.onBack}>Back to Session</button>
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
    handleExportOverviewTxt: jest.fn(),
    handleExportDiscussionsCsv: jest.fn(),
    handleExportStatistics: jest.fn(),
    handleActivate: jest.fn(),
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

describe('SessionEndedView (Acceptance)', () => {
  // 6.1
  it('[US 1.09][AT1] success: ended header renders', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);
    expect(screen.getByText(/Ended Header:\s*Ended Lesson/i)).toBeInTheDocument();
  });

  // 6.2 — responses are hidden behind "Show Responses" toggle in new design
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
    expect(screen.getByRole('heading', { name: /^Discussions$/i })).toBeInTheDocument();
    expect(screen.getByText(/What is 2\+2\?/i)).toBeInTheDocument();

    // Responses are behind the toggle — expand first
    fireEvent.click(screen.getByText(/Show Responses/i));
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
  it('[US 1.09][AT1] success: clicking Export overview TXT calls vm.handleExportOverviewTxt', async () => {
    const vm = makeVM();
    const user = userEvent.setup();

    render(<SessionEndedView vm={vm} />);

    await user.click(screen.getByRole('button', { name: /Export Overview TXT/i }));


    expect(vm.handleExportOverviewTxt).toHaveBeenCalled();
  });

  it('[US 1.09][AT1] success: clicking Export Discussions CSV calls vm.handleExportDiscussionsCsv', async () => {
    const vm = makeVM();
    const user = userEvent.setup();

    render(<SessionEndedView vm={vm} />);

    await user.click(screen.getByRole('button', { name: /Export Discussions CSV/i }));

    expect(vm.handleExportDiscussionsCsv).toHaveBeenCalled();
  });

  it('[US 1.09][AT1] success: clicking Export Statistics calls vm.handleExportStatistics', async () => {
    const vm = makeVM();
    const user = userEvent.setup();

    render(<SessionEndedView vm={vm} />);

    await user.click(screen.getByRole('button', { name: /Export Statistics/i }));

    expect(vm.handleExportStatistics).toHaveBeenCalled();
  });



  // 6.6
  it('[US 1.06][AT3] success: clicking Activate calls vm.handleActivate', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Activate/i }));
    expect(vm.handleActivate).toHaveBeenCalled();
  });

  it('[US 1.14][AT5] success: renders transcript segments when present', () => {
    const vm = makeVM({
      transcripts: [
        { id: 't1', content: 'First transcript chunk', created_at: '2026-03-06T10:00:00Z' },
        { id: 't2', content: 'Second transcript chunk', created_at: '2026-03-06T10:05:00Z' },
      ],
    });

    render(<SessionEndedView vm={vm} />);
    expect(screen.getByText(/First transcript chunk/i)).toBeInTheDocument();
    expect(screen.getByText(/Second transcript chunk/i)).toBeInTheDocument();
  });

  it('[US 1.14] success: renders uploaded lecture materials', () => {
    const vm = makeVM({
      files: [
        {
          id: 'f1',
          lessonId: 'lesson-1',
          fileName: 'lecture-1.pdf',
          fileType: 'pdf',
          fileSizeBytes: 1024,
          status: 'ready',
          uploadedAt: '2026-03-06T10:00:00Z',
        },
      ],
    });
    render(<SessionEndedView vm={vm} />);
    expect(screen.getByText(/lecture-1\.pdf/i)).toBeInTheDocument();
  });

  // download button text is "Download" not "download file"
  it('[US 1.14] success: clicking download calls vm.openFile', () => {
    const vm = makeVM({
      files: [
        {
          id: 'f1',
          lessonId: 'lesson-1',
          fileName: 'lecture-1.pdf',
          fileType: 'pdf',
          fileSizeBytes: 1024,
          status: 'ready',
          uploadedAt: '2026-03-06T10:00:00Z',
        },
      ],
    });

    render(<SessionEndedView vm={vm} />);
    fireEvent.click(screen.getByRole('button', { name: /^Download$/i }));
    expect(vm.openFile).toHaveBeenCalledWith('f1');
  });

  // 6.7 — "Discussions and Responses" no longer exists, section heading is "Discussions"
  it('success: clicking Split View opens the split view overlay', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Split View/i }));

    expect(screen.getByText('Split View Overlay')).toBeInTheDocument();
    expect(screen.queryByText('No discussions recorded.')).not.toBeInTheDocument();
  });

  // 6.8 — same heading fix
  it('success: clicking Back to Session returns to normal ended view', () => {
    const vm = makeVM();
    render(<SessionEndedView vm={vm} />);

    fireEvent.click(screen.getByRole('button', { name: /Split View/i }));
    expect(screen.getByText('Split View Overlay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to Session/i }));
    expect(screen.queryByText('Split View Overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Discussions$/i })).toBeInTheDocument();
  });

  // 6.9
  it('success: passes lessonDiscussions with response_count to SplitView', () => {
    const vm = makeVM({
      lessonDiscussions: [
        {
          id: 'd1',
          lesson_id: 'lesson-1',
          prompt_text: 'What is 2+2?',
          prompt_type: 'short_answer',
          status: 'closed',
          created_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
          display_order: 0,
          source: null,
          mc_options: null,
          responses: [
            { id: 'r1', discussion_id: 'd1', response_text: '4', created_at: new Date().toISOString() },
            { id: 'r2', discussion_id: 'd1', response_text: 'Four', created_at: new Date().toISOString() },
          ],
        } as any,
        {
          id: 'd2',
          lesson_id: 'lesson-1',
          prompt_text: 'What is 3+3?',
          prompt_type: 'short_answer',
          status: 'closed',
          created_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
          display_order: 1,
          source: null,
          mc_options: null,
          responses: [],
        } as any,
      ],
    });
    render(<SessionEndedView vm={vm} />);
    fireEvent.click(screen.getByRole('button', { name: /Split View/i }));

    expect(screen.getByText('Discussions: 2')).toBeInTheDocument();
  });
  
  it('shows an error message when vm.endError exists', () => {
    const vm = makeVM({
      endError: 'Failed to export statistics.',
    });

    render(<SessionEndedView vm={vm} />);

    expect(screen.getByText('Failed to export statistics.')).toBeInTheDocument();
  });

  it('shows an error message when discussions export fails', () => {
    const vm = makeVM({
      endError: 'Failed to export discussions CSV.',
    });

    render(<SessionEndedView vm={vm} />);

    expect(screen.getByText('Failed to export discussions CSV.')).toBeInTheDocument();
  });


});