import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActiveRightPanel } from '@/components/instructor/session/ActiveRightPanel';
import { SessionContext } from '@/components/instructor/session/SessionContext';
import { useResponseSelection } from '@/hooks/useResponseSelection';

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: any) => <div>{children}</div>,
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: any) => <button>{children}</button>,
    TabsContent: ({ children, value }: any) => <div data-testid={`content-${value}`}>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/hooks/useResponseSelection', () => ({
    useResponseSelection: jest.fn(),
}));

jest.mock('@/components/instructor/session/TimerTab', () => ({
    TimerTab: () => <div data-testid="timer-tab" />,
}));

jest.mock('@/components/instructor/session/ResponseListTab', () => ({
    ResponseListTab: () => <div data-testid="response-list-tab" />,
}));

jest.mock('@/components/instructor/session/DiscussionAnalyticsModal', () => ({
    DiscussionAnalyticsContent: () => <div data-testid="analytics-content" />,
}));

describe('ActiveRightPanel', () => {
    const defaultContext = {
        responses: [{ id: 'r1', response_text: 'Resp' }],
        activeDiscussion: { id: 'd1', prompt_type: 'long_answer' },
        studentCount: 10,
        peakStudentCount: 12,
        discussionTimerEndTime: null,
        discussionTimerSeconds: null,
        handleCloseDiscussion: jest.fn(),
        handleExtendTimer: jest.fn(),
        handleEditTimer: jest.fn(),
        removeResponse: jest.fn(),
        restoreResponse: jest.fn(),
        flaggedResponses: []
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useResponseSelection as jest.Mock).mockReturnValue({
            resetSelection: jest.fn(),
            filterResponses: (r: any) => r,
            selectedIds: [],
        });
    });

    const renderWithContext = (context = defaultContext) => {
        return render(
            <SessionContext.Provider value={context as any}>
                <ActiveRightPanel />
            </SessionContext.Provider>
        );
    };

    it('success: renders and toggles collapse', () => {
        const { container } = renderWithContext();
        expect(screen.getByText('Live Responses')).toBeInTheDocument();
        expect(screen.getByText(/12/)).toBeInTheDocument(); // peakStudentCount

        fireEvent.click(screen.getByLabelText(/Collapse/i));
        expect(container.firstChild).toHaveStyle('width: 52px');

        fireEvent.click(screen.getByLabelText(/Expand/i));
        expect(container.firstChild).toHaveStyle('width: 380px');
    });

    it('success: switches tabs', () => {
        renderWithContext();
        
        fireEvent.click(screen.getByText('Metrics'));
        expect(screen.getByTestId('analytics-content')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Timer'));
        expect(screen.getByTestId('timer-tab')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Responses'));
        expect(screen.getByTestId('response-list-tab')).toBeInTheDocument();
    });

    it('success: opens tabs from collapsed icons', () => {
        const { container } = renderWithContext();
        fireEvent.click(screen.getByLabelText(/Collapse/i));

        // Metics icon (mocked via title)
        fireEvent.click(screen.getByTitle('Metrics'));
        expect(container.firstChild).toHaveStyle('width: 380px');
        expect(screen.getByTestId('analytics-content')).toBeInTheDocument();
    });

    it('success: displays MC distribution if applicable', () => {
        const mcContext = {
            ...defaultContext,
            activeDiscussion: {
                id: 'd1',
                prompt_type: 'multiple_choice',
                mc_options: [{ label: 'A', text: 'Opt A' }]
            },
            responses: [{ id: 'r1', selected_option: 'A' }]
        };
        renderWithContext(mcContext as any);
        expect(screen.getByTestId('response-list-tab')).toBeInTheDocument();
    });
});
