import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { RestartDiscussionButton } from '@/components/instructor/session/RestartDiscussionButton';
import type { Discussion } from '@/types/discussion';

describe('RestartDiscussionButton', () => {
    const mockDiscussion: Discussion = {
        id: 'd1',
        lesson_id: 'l1',
        prompt_text: 'Test Prompt',
        prompt_type: 'short_answer',
        status: 'closed',
        created_at: '2024-01-01T10:00:00Z',
        published_at: '2024-01-01T10:00:00Z',
        closed_at: '2024-01-01T10:30:00Z',
        display_order: 1,
        participant_snapshot: 5,
        mc_options: null,
        correct_option: null,
        source: 'manual',
        feedback_enabled: false,
        ai_generated_correct_option: null,
        allow_multiple_responses: false,
        response_limit: 1,
        time_limit_seconds: 60,
    };

    const props = {
        discussion: mockDiscussion,
        onRestart: jest.fn().mockResolvedValue(undefined),
        isLessonActive: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null if lesson is not active', () => {
        const { container } = render(<RestartDiscussionButton {...props} isLessonActive={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('returns null if discussion is active', () => {
        const activeDisc = { ...mockDiscussion, status: 'active' as const };
        const { container } = render(<RestartDiscussionButton {...props} discussion={activeDisc} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders with different sizes', () => {
        const { rerender } = render(<RestartDiscussionButton {...props} size="sm" />);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(<RestartDiscussionButton {...props} size="lg" />);
        expect(screen.getByRole('button')).toBeInTheDocument();

        rerender(<RestartDiscussionButton {...props} size="md" />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('shows text when showText is true', () => {
        render(<RestartDiscussionButton {...props} showText={true} />);
        expect(screen.getByText('Restart')).toBeInTheDocument();
    });

    it('handles restart correctly', async () => {
        render(<RestartDiscussionButton {...props} showText={true} />);
        const button = screen.getByRole('button');

        await act(async () => {
            fireEvent.click(button);
        });

        expect(props.onRestart).toHaveBeenCalledWith(
            mockDiscussion,
            60,
            false,
            { allowMultipleResponses: false, responseLimit: 1 }
        );
    });

    it('handles restart failure', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const failingProps = {
            ...props,
            onRestart: jest.fn().mockRejectedValue(new Error('Fail')),
        };

        render(<RestartDiscussionButton {...failingProps} showText={true} />);
        const button = screen.getByRole('button');

        await act(async () => {
            fireEvent.click(button);
        });

        expect(consoleSpy).toHaveBeenCalledWith('Failed to restart discussion:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});
