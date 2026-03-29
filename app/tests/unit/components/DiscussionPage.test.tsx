import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiscussionPage } from '@/components/instructor/DiscussionPage';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { useResponseSelection } from '@/hooks/useResponseSelection';
import { flagResponseApi, unflagResponseApi } from '@/lib/api/discussionsApi';

jest.mock('@/lib/realtime/useRealtime', () => ({
    useRealtime: jest.fn(),
}));

jest.mock('@/hooks/useResponseSelection', () => ({
    useResponseSelection: jest.fn(),
}));

jest.mock('@/lib/api/discussionsApi', () => ({
    flagResponseApi: jest.fn(),
    unflagResponseApi: jest.fn(),
    updateParticipantSnapshotApi: jest.fn(),
}));

jest.mock('@/hooks/useParticipantPeak', () => ({
    useParticipantPeak: () => 0,
}));

jest.mock('@/components/instructor/session/DiscussionAnalyticsModal', () => ({
    DiscussionAnalyticsContent: () => <div data-testid="analytics" />,
}));

jest.mock('@/components/instructor/ResponseCard', () => ({
    ResponseCard: ({ onToggle, onFlag, responseText, isSelected }: any) => (
        <div data-testid="response-card" className={isSelected ? 'selected' : ''}>
            <span>{responseText}</span>
            <button onClick={onToggle}>Toggle</button>
            <button onClick={onFlag}>Flag/Restore</button>
        </div>
    )
}));

jest.mock('@/components/instructor/FilterToggle', () => ({
    FilterToggle: () => <div data-testid="filter-toggle" />,
}));

jest.mock('@/components/instructor/FlaggedFilterToggle', () => ({
    FlaggedFilterToggle: ({ onToggle }: any) => (
        <div data-testid="flagged-toggle">
            <button onClick={onToggle}>Show Flagged</button>
        </div>
    )
}));

describe('DiscussionPage', () => {
    const defaultProps = {
        lessonId: 'l1',
        discussionId: 'd1',
        initialDiscussion: {
            id: 'd1',
            lesson_id: 'l1',
            prompt_text: 'Test Prompt',
            prompt_type: 'long_answer' as const,
            participant_snapshot: 10,
            status: 'active' as const,
            created_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            timer_seconds: null,
            timer_ends_at: null,
            correct_option: null,
            mc_options: null,
            closed_at: null,
            display_order: 1,
            source: 'manual' as const,
            feedback_enabled: false,
            ai_generated_correct_option: null,
            allow_multiple_responses: false,
            response_limit: 1,
        },
        initialResponses: [
            { id: 'r1', discussion_id: 'd1', response_text: 'Resp 1', created_at: new Date().toISOString(), selected_option: null, is_correct: null, flagged_at: null, student_session_id: 'student-1' }
        ],
        initialFlaggedResponses: [],
        initialIsActive: true
    };

    const mockChannel = {
        on: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRealtime as jest.Mock).mockReturnValue({ channel: mockChannel, isConnected: true, studentCount: 0 });
        (useResponseSelection as jest.Mock).mockReturnValue({
            selectedIds: [],
            flaggingId: null,
            showHighlightedOnly: false,
            toggleSelected: jest.fn(),
            handleFlagInappropriate: jest.fn(),
            setShowHighlightedOnly: jest.fn(),
            filterResponses: (rs: any) => rs,
        });
    });

    it('success: renders discussion details and responses', () => {
        render(<DiscussionPage {...defaultProps} />);
        expect(screen.getByText('Test Prompt')).toBeInTheDocument();
        expect(screen.getByText('Resp 1')).toBeInTheDocument();
        expect(screen.getByTestId('analytics')).toBeInTheDocument();
    });

    it('success: handles response flagging and restoration', async () => {
        let onRemoveCallback: any;
        (useResponseSelection as jest.Mock).mockImplementation(({ onRemove }) => {
            onRemoveCallback = onRemove;
            return {
                selectedIds: [],
                filterResponses: (rs: any) => rs,
                handleFlagInappropriate: async (id: string) => { await onRemove(id); }
            };
        });

        render(<DiscussionPage {...defaultProps} />);
        
        // Flag
        await act(async () => {
            fireEvent.click(screen.getAllByText('Flag/Restore')[0]);
        });
        expect(flagResponseApi).toHaveBeenCalledWith('r1');
        
        // Should show flagged toggle now
        expect(screen.getByTestId('flagged-toggle')).toBeInTheDocument();

        // Switch to flagged view
        fireEvent.click(screen.getByText('Show Flagged'));
        expect(screen.getByText('Resp 1')).toBeInTheDocument();

        // Restore
        (unflagResponseApi as jest.Mock).mockResolvedValue({});
        await act(async () => {
            fireEvent.click(screen.getByText('Flag/Restore')); // This is in the flagged view now
        });
        expect(unflagResponseApi).toHaveBeenCalledWith('r1');
    });

    it('success: handles realtime new response', () => {
        let broadcastCallback: any;
        mockChannel.on.mockImplementation((event, filter, cb) => {
            if (event === 'broadcast') broadcastCallback = cb;
        });

        render(<DiscussionPage {...defaultProps} />);
        
        const newResp = { id: 'r2', response_text: 'New Resp', discussion_id: 'd1' };
        act(() => {
            broadcastCallback({ payload: { response: newResp } });
        });

        expect(screen.getByText('New Resp')).toBeInTheDocument();
    });

    it('success: renders MC distribution', () => {
        const mcProps = {
            ...defaultProps,
            initialDiscussion: {
                ...defaultProps.initialDiscussion,
                prompt_type: 'multiple_choice' as const,
                mc_options: [
                    { label: 'A' as const, text: 'Option A' },
                    { label: 'B' as const, text: 'Option B' }
                ],
                correct_option: 'A' as const
            },
            initialResponses: [
                { id: 'r1', discussion_id: 'd1', selected_option: 'A', response_text: 'A', created_at: new Date().toISOString(), is_correct: true, flagged_at: null, student_session_id: 'student-1' }
            ]
        };

        render(<DiscussionPage {...mcProps} />);
        expect(screen.getByText('1 responses')).toBeInTheDocument(); // For option A
        expect(screen.getByText(/Correct: A/i)).toBeInTheDocument();
    });
});
