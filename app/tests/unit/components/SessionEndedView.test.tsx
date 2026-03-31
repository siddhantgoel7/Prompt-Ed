import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionEndedView } from '@/components/instructor/session/SessionEndedView';
import { SessionContext } from '@/components/instructor/session/SessionContext';

// Mock subcomponents
jest.mock('@/components/instructor/session/SessionHeaderEnded', () => ({
  SessionHeaderEnded: ({ onSplitView }: any) => <button onClick={onSplitView}>Header Split</button>
}));
jest.mock('@/components/instructor/session/SplitView', () => ({
  SplitView: ({ onBack }: any) => <button onClick={onBack}>Back from Split</button>
}));
jest.mock('@/components/instructor/session/EndedDiscussionCard', () => ({
  EndedDiscussionCard: () => <div data-testid="ended-card">Card</div>
}));

// Mock SessionProvider to avoid deep context logic
jest.mock('@/components/instructor/session/SessionContext', () => {
    const Actual = jest.requireActual('@/components/instructor/session/SessionContext');
    return {
        ...Actual,
        SessionProvider: ({ children }: any) => <div>{children}</div>
    };
});

describe('SessionEndedView', () => {
    const mockVm = {
        lesson: { id: 'l1', started_at: '2023-01-01T10:00:00Z', ended_at: '2023-01-01T11:00:00Z' },
        lessonDiscussions: [
            { id: 'd1', prompt_text: 'Q1', responses: [{ id: 'r1' }] }
        ],
        transcripts: [{ id: 't1', content: 'hello', metadata: { recordedAt: '2023-01-01T10:10:00Z' } }],
        transcriptsLoading: false,
        files: [{ id: 'f1', fileName: 'test.pdf', fileType: 'pdf', uploadedAt: '2023-01-01T10:05:00Z' }],
        openFile: jest.fn(),
        historyLoading: false,
        historyError: null,
        endError: null,
    } as any;

    it('renders overview with summary bar', () => {
        render(<SessionEndedView vm={mockVm} />);
        
        expect(screen.getByText(/1\s*prompts/i)).toBeInTheDocument(); // Discussions count label
        expect(screen.getByText('Duration')).toBeInTheDocument();
        expect(screen.getByText('1h 0m')).toBeInTheDocument();
        expect(screen.getByTestId('ended-card')).toBeInTheDocument();
        expect(screen.getByText('Transcript')).toBeInTheDocument();
        expect(screen.getByText('Lecture Material')).toBeInTheDocument();
    });

    it('handles split view toggle', () => {
        render(<SessionEndedView vm={mockVm} />);
        
        fireEvent.click(screen.getByText('Header Split'));
        expect(screen.getByText('Back from Split')).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Back from Split'));
        expect(screen.getByText('Header Split')).toBeInTheDocument();
    });

    it('shows loading and error states for transcripts', () => {
        const loadingVm = { ...mockVm, transcriptsLoading: true, transcripts: [] };
        render(<SessionEndedView vm={loadingVm} />);
        expect(screen.getByText('Loading transcripts...')).toBeInTheDocument();
    });

    it('shows "No transcripts" when empty', () => {
        const emptyVm = { ...mockVm, transcripts: [] };
        render(<SessionEndedView vm={emptyVm} />);
        expect(screen.getByText('No transcripts used.')).toBeInTheDocument();
    });

    it('shows end error message', () => {
        const errorVm = { ...mockVm, endError: 'Failed to save' };
        render(<SessionEndedView vm={errorVm} />);
        expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });

    it('handles download click', () => {
        render(<SessionEndedView vm={mockVm} />);
        fireEvent.click(screen.getByText('Download'));
        expect(mockVm.openFile).toHaveBeenCalledWith('f1');
    });

});
