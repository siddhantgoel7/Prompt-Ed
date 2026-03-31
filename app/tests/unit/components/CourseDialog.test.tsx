import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CourseDialog } from '@/components/instructor/CourseDialog';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(),
}));

// Mock radix components to be visible
jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
}));

describe('CourseDialog', () => {
    const props = {
        open: true,
        onOpenChange: jest.fn(),
        title: 'Add a Course',
        mode: 'add' as const,
        value: { title: '', image_url: '' },
        onChange: jest.fn(),
        onSubmit: jest.fn(),
        error: null,
        saving: false,
    };

    const mockSupabase = {
        storage: {
            from: jest.fn().mockReturnThis(),
            upload: jest.fn(),
            getPublicUrl: jest.fn(),
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    it('renders with initial values', () => {
        render(<CourseDialog {...props} />);
        expect(screen.getByText('Add a Course')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., PMCOL 400 Lec A1')).toBeInTheDocument();
    });

    it('triggers onChange when typing title', () => {
        render(<CourseDialog {...props} />);
        const input = screen.getByPlaceholderText('e.g., PMCOL 400 Lec A1');
        
        fireEvent.change(input, { target: { value: 'New Course' } });
        expect(props.onChange).toHaveBeenCalled();
    });

    it('triggers onSubmit on form submit', () => {
        render(<CourseDialog {...props} />);
        const form = screen.getByRole('button', { name: /Add Course/i }).closest('form')!;
        
        fireEvent.submit(form);
        expect(props.onSubmit).toHaveBeenCalled();
    });

    it('handles image upload success', async () => {
        mockSupabase.storage.upload.mockResolvedValue({ error: null });
        mockSupabase.storage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'http://test.com/img.jpg' } });

        render(<CourseDialog {...props} />);
        const input = screen.getByTestId('course-image-input');

        const file = new File(['foo'], 'foo.png', { type: 'image/png' });
        
        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        expect(mockSupabase.storage.upload).toHaveBeenCalled();
        expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({
            target: { name: 'image_url', value: 'http://test.com/img.jpg' }
        }));
    });

    it('handles image upload failure', async () => {
        mockSupabase.storage.upload.mockResolvedValue({ error: new Error('Fail') });

        render(<CourseDialog {...props} />);
        const input = screen.getByTestId('course-image-input');

        const file = new File(['foo'], 'foo.png', { type: 'image/png' });
        
        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        expect(screen.getByText('Failed to upload image. Please try again.')).toBeInTheDocument();
    });

    it('validates image size', async () => {
        render(<CourseDialog {...props} />);
        const input = screen.getByTestId('course-image-input');

        const largeFile = new File(['f'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
        
        await act(async () => {
            fireEvent.change(input, { target: { files: [largeFile] } });
        });

        expect(screen.getByText('Image must be under 5 MB.')).toBeInTheDocument();
    });

    it('removes image correctly', () => {
        const editProps = {
            ...props,
            mode: 'edit' as const,
            value: { title: 'Test', image_url: 'http://test.com/img.jpg' }
        };
        render(<CourseDialog {...editProps} />);
        
        const removeBtn = screen.getByText('Remove');
        fireEvent.click(removeBtn);

        expect(props.onChange).toHaveBeenCalledWith(expect.objectContaining({
            target: { name: 'image_url', value: '' }
        }));
    });

    it('shows saving states', () => {
        const { rerender } = render(<CourseDialog {...props} saving={true} />);
        expect(screen.getByText('Adding...')).toBeInTheDocument();

        rerender(<CourseDialog {...props} mode="edit" saving={true} />);
        expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
});
