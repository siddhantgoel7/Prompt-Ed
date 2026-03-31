/**
 * Acceptance Tests — [US 1.12] Reconnect if my connection fails
 * 
 * As an Instructor
 * I want reconnect if my connection fails
 * So that I can continue my lesson where I left off
 * 
 * Acceptance Criteria:
 *   AC1: GIVEN an instructor with active lesson WHEN connection is lost THEN they can click "Reconnect" to rejoin
 *   AC2: GIVEN an instructor WHEN they reconnect to active lesson THEN the lesson state (current discussion, student count) is preserved
 *   AC3: GIVEN an instructor WHEN they reconnect THEN student responses submitted during disconnection are visible
 *   AC4: GIVEN an instructor WHEN they reconnect THEN they see a message confirming successful reconnection
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionActiveView } from '@/components/instructor/session/SessionActiveView';
import type { SessionVM } from '@/hooks/useSessionPage';


// We mock the internals except ConnectionStatus to test the integration of connection state
jest.mock('@/components/instructor/session/SessionHeaderActive', () => ({
    SessionHeaderActive: () => <div>SessionHeaderActive</div>,
}));
jest.mock('@/components/instructor/session/SplitView', () => ({
    SplitView: () => <div>SplitView</div>,
}));
jest.mock('@/components/instructor/session/JoinCodeOverlay', () => ({
    JoinCodeOverlay: () => <div>JoinCodeOverlay</div>,
}));
jest.mock('@/components/instructor/session/ActiveSidebar', () => ({
    ActiveSidebar: () => <div>ActiveSidebar</div>,
}));
jest.mock('@/components/instructor/session/ActiveRightPanel', () => ({
    ActiveRightPanel: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
        return <div data-testid="right-panel">RightPanel count={vm.responses?.length ?? 0}</div>;
    },
}));
jest.mock('@/components/instructor/session/ActiveCenter', () => ({
    ActiveCenter: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const vm = require('@/components/instructor/session/SessionContext').useSessionContext();
        return (
            <div data-testid="center-panel">
                <div>Center</div>
                <div>activeDiscussionId={String(vm.activeDiscussion?.id ?? null)}</div>
            </div>
        );
    },
}));

function makeVM(overrides: Partial<SessionVM> = {}): SessionVM {
    return {
        lesson: { id: 'lesson-1', title: 'Test Lesson', status: 'active', pin_code: '123456' } as any,
        loading: false,
        notFound: false,
        isConnected: false,
        handleReconnect: jest.fn(),
        discussions: [],
        activeDiscussion: { id: 'disc-1', prompt_text: 'Test Prompt' } as any,
        responses: [{ id: 'resp-1', response_text: 'Answer 1' }, { id: 'resp-2', response_text: 'Answer 2' }] as any,
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

describe('[US 1.12] Instructor Reconnect (Acceptance)', () => {

    // 36.1
    it('[US 1.12][AC1-AT1] success: can click Reconnect when connection is lost', () => {
        // Render with 3 actual components and mocked children
        const vm = makeVM({ isConnected: false });
        render(<SessionActiveView vm={vm} />);

        const reconnectBtn = screen.getByRole('button', { name: /Reconnect/i });
        expect(reconnectBtn).toBeInTheDocument();

        fireEvent.click(reconnectBtn);
        expect(vm.handleReconnect).toHaveBeenCalled();
    });

    // 36.2
    it('[US 1.12][AC2-AT1] success: lesson state (discussion) is preserved when reconnected', () => {
        // Initial disconnect state
        let vm = makeVM({ isConnected: false });
        const { rerender } = render(<SessionActiveView vm={vm} />);

        // Check discussion is present
        expect(screen.getAllByTestId('center-panel')[0]).toHaveTextContent('activeDiscussionId=disc-1');

        // Rerender as connected
        vm = makeVM({ isConnected: true });
        rerender(<SessionActiveView vm={vm} />);

        // State is still there
        expect(screen.getAllByTestId('center-panel')[0]).toHaveTextContent('activeDiscussionId=disc-1');
    });

    // 36.3
    it('[US 1.12][AC3-AT1] success: responses submitted during disconnect are visible upon reconnect', () => {
        let vm = makeVM({ isConnected: false, responses: [] });
        const { rerender } = render(<SessionActiveView vm={vm} />);

        expect(screen.getAllByTestId('right-panel')[0]).toHaveTextContent('RightPanel count=0');

        // Simulated reconnect fetching new responses
        vm = makeVM({ isConnected: true, responses: [{ id: 'resp-1' }, { id: 'resp-2' }] as any });
        rerender(<SessionActiveView vm={vm} />);

        expect(screen.getAllByTestId('right-panel')[0]).toHaveTextContent('RightPanel count=2');
    });
});
