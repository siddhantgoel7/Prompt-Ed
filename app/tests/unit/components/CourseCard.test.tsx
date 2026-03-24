import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCard } from '@/components/instructor/CourseCard';
import type { Course } from '@/types/course';

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('CourseCard', () => {
    const mockCourse: Course = {
        id: 'c1',
        instructor_id: 'i1',
        title: 'Test Course',
        image_url: undefined,
        date_created: '2026-03-24T12:00:00Z',
    };

    const props = {
        course: mockCourse,
        onAccess: jest.fn(),
        onEdit: jest.fn(),
        onDelete: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('success: renders course info and triggers onAccess', () => {
        render(<CourseCard {...props} />);
        
        expect(screen.getByText('Test Course')).toBeInTheDocument();
        // Relaxed date check
        expect(screen.getByText(/24/)).toBeInTheDocument();
        expect(screen.getByText(/2026/)).toBeInTheDocument();

        fireEvent.click(screen.getByText('Test Course'));
        expect(props.onAccess).toHaveBeenCalled();
    });

    it('success: handles keyboard access (Enter/Space)', () => {
        const { container } = render(<CourseCard {...props} />);
        const card = container.firstChild as HTMLElement;
        
        fireEvent.keyDown(card, { key: 'Enter' });
        expect(props.onAccess).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(card, { key: ' ' });
        expect(props.onAccess).toHaveBeenCalledTimes(2);
    });

    it('success: opens dropdown and triggers onEdit/onDelete', async () => {
        render(<CourseCard {...props} />);
        
        // Items should be visible now because of the mock
        fireEvent.click(screen.getByText('Edit'));
        expect(props.onEdit).toHaveBeenCalled();

        fireEvent.click(screen.getByText('Delete'));
        expect(props.onDelete).toHaveBeenCalled();
    });

    it('success: handles hover styles (simulation)', () => {
        render(<CourseCard {...props} />);
        const btn = screen.getByText('Open Course');
        
        fireEvent.mouseEnter(btn);
        expect(btn).toHaveStyle('background: var(--color-primary-500)');

        fireEvent.mouseLeave(btn);
        expect(btn).toHaveStyle('background: var(--color-primary-alpha-12)');
    });
});
