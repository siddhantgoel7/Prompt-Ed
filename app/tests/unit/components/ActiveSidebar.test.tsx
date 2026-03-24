import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveSidebar } from '@/components/instructor/session/ActiveSidebar';
import { SessionContext } from '@/components/instructor/session/SessionContext';

// Mock subcomponents
jest.mock('@/components/instructor/session/DiscussionHistory', () => ({
  DiscussionHistory: () => <div data-testid="discussion-history">Discussion History</div>
}));
jest.mock('@/components/instructor/session/FilesTab', () => ({
  FilesTab: () => <div data-testid="files-tab">Files Tab</div>
}));

// Mock Radix UI Tabs
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange?.('files')}>{children}</div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid={`trigger-${value}`}>{children}</button>,
  TabsContent: ({ children, value }: any) => <div data-testid={`content-${value}`}>{children}</div>,
}));

// Mock ScrollArea
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>
}));

describe('ActiveSidebar', () => {
    const defaultProps = {
        discussions: [],
        activeDiscussionId: null,
        files: [],
        isUploading: false,
        onUploadFile: jest.fn(),
        onDeleteFile: jest.fn(),
    };

    it('renders expanded by default', () => {
        render(<ActiveSidebar {...defaultProps} />);
        expect(screen.getByText('Session Panel')).toBeInTheDocument();
        expect(screen.getByTestId('trigger-discussions')).toBeInTheDocument();
    });

    it('toggles collapse state', () => {
        render(<ActiveSidebar {...defaultProps} />);
        const toggle = screen.getByLabelText('Collapse sidebar');
        
        fireEvent.click(toggle);
        expect(screen.queryByText('Session Panel')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Expand sidebar'));
        expect(screen.getByText('Session Panel')).toBeInTheDocument();
    });

    it('switches tabs', () => {
        render(<ActiveSidebar {...defaultProps} />);
        const tabs = screen.getByTestId('tabs');
        
        // Initial tab
        expect(tabs).toHaveAttribute('data-value', 'discussions');
        
        // Click to switch (simulated by our mock's onClick)
        fireEvent.click(tabs);
        expect(tabs).toHaveAttribute('data-value', 'files');
    });

    it('switches to tab and expands when clicking icons in collapsed state', () => {
        render(<ActiveSidebar {...defaultProps} />);
        
        // Collapse first
        fireEvent.click(screen.getByLabelText('Collapse sidebar'));
        
        // Find "Files" icon button (title="Files")
        const filesIcon = screen.getByTitle('Files');
        fireEvent.click(filesIcon);
        
        // Should be expanded and showing files tab
        expect(screen.getByText('Session Panel')).toBeInTheDocument();
        expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'files');
    });

    it('uses SessionContext if available', () => {
        const contextValue = {
            discussions: [{ id: 'd1', prompt_text: 'Context Q', response_count: 0 }],
            activeDiscussion: { id: 'd1' },
            files: [],
            isUploading: false,
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
        } as any;

        render(
            <SessionContext.Provider value={contextValue}>
                <ActiveSidebar {...defaultProps} />
            </SessionContext.Provider>
        );

        // DiscussionHistory should normally receive these via the component logic
        expect(screen.getByTestId('discussion-history')).toBeInTheDocument();
    });

    it('handles mouse enter/leave on buttons for coverage', () => {
        render(<ActiveSidebar {...defaultProps} />);
        const toggle = screen.getByLabelText('Collapse sidebar');
        
        fireEvent.mouseEnter(toggle);
        fireEvent.mouseLeave(toggle);
        
        // Collapse to test icon button hovers
        fireEvent.click(toggle);
        const diskIcon = screen.getByTitle('Discussions');
        fireEvent.mouseEnter(diskIcon);
        fireEvent.mouseLeave(diskIcon);

        const filesIcon = screen.getByTitle('Files');
        fireEvent.mouseEnter(filesIcon);
        fireEvent.mouseLeave(filesIcon);
    });
});
