// Covers US 1.25, 1.34, 1.37, 1.39
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SplitView } from '@/components/instructor/session/SplitView';
import { createClient } from '@/lib/supabase/client';
import {
  mockDiscussion,
  mockClosedDiscussion,
  mockResponse,
  mockResponse2,
  withResponseCount,
  createMockResponses,
} from '../fixtures/discussions';
import type { DiscussionWithResponseCount } from '@/types/discussion';

jest.mock('@/lib/supabase/client');

const originalConsoleError = console.error;
const originalConsoleLog = console.log;
beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

const activeDisc: DiscussionWithResponseCount = withResponseCount(mockDiscussion, 3);
const closedDisc: DiscussionWithResponseCount = withResponseCount(mockClosedDiscussion, 5);
const discussions: DiscussionWithResponseCount[] = [activeDisc, closedDisc];

describe('SplitView Component', () => {
  let mockSupabase: any;
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Layout and Navigation', () => {
    // 64.1
    it('[US 1.39] renders full-screen overlay with back button and title', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      expect(screen.getByText('Split View')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Session/i })).toBeInTheDocument();
    });

    // 64.2
    it('[US 1.39] calls onBack when "Back to Session" is clicked', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: /Back to Session/i }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    // 64.3
    it('[US 1.39] renders left and right pane labels', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      expect(screen.getByText('Left Pane')).toBeInTheDocument();
      expect(screen.getByText('Right Pane')).toBeInTheDocument();
    });
  });

  describe('Discussion Selection', () => {
    // 64.4
    it('[US 1.25][US 1.39] shows active and closed tabs in each pane', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const activeTabs = screen.getAllByRole('tab', { name: /Active/i });
      const closedTabs = screen.getAllByRole('tab', { name: /Closed/i });
      expect(activeTabs).toHaveLength(2);
      expect(closedTabs).toHaveLength(2);
    });

    // 64.5
    it('[US 1.25][US 1.39] displays active discussion cards with prompt text and response count', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const prompts = screen.getAllByText(/What is the main purpose/i);
      expect(prompts.length).toBeGreaterThanOrEqual(2);

      const counts = screen.getAllByText('3');
      expect(counts.length).toBeGreaterThanOrEqual(2);
    });

    // 64.6
    it('[US 1.25][US 1.39] renders closed tab with correct count', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const closedTabs = screen.getAllByRole('tab', { name: /Closed \(1\)/i });
      expect(closedTabs).toHaveLength(2);
    });

    // 64.7
    it('[US 1.25][US 1.39] shows status badges on discussion cards', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    });

    // 64.8
    it('[US 1.25][US 1.39] handles empty discussion list gracefully', () => {
      render(<SplitView discussions={[]} lessonId="lesson-456" onBack={onBack} />);

      const noDiscussions = screen.getAllByText(/No discussions/i);
      expect(noDiscussions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Discussion Detail View', () => {
    // 64.9
    it('[US 1.37][US 1.39] shows discussion detail with prompt and back button after selecting a discussion', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [mockResponse, mockResponse2],
                error: null,
              }),
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        const backButtons = screen.getAllByRole('button', { name: /Back/i });
        expect(backButtons.length).toBeGreaterThanOrEqual(2);
      });

      const promptElements = screen.getAllByText(mockDiscussion.prompt_text);
      expect(promptElements.length).toBeGreaterThanOrEqual(1);
    });

    // 64.10
    it('[US 1.37][US 1.39] fetches responses from Supabase when discussion is selected', async () => {
      const responsesData = createMockResponses('discussion-123', 3);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: responsesData,
                error: null,
              }),
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('responses');
      });

      await waitFor(() => {
        expect(screen.getByText('Student response #1 to the discussion prompt.')).toBeInTheDocument();
        expect(screen.getByText('Student response #2 to the discussion prompt.')).toBeInTheDocument();
        expect(screen.getByText('Student response #3 to the discussion prompt.')).toBeInTheDocument();
      });
    });

    // 64.11
    it('[US 1.37][US 1.39] returns to discussion list when pane back button is clicked', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        const backButtons = screen.getAllByRole('button', { name: /^Back$/i });
        expect(backButtons.length).toBeGreaterThanOrEqual(1);
      });

      const backButtons = screen.getAllByRole('button', { name: /^Back$/i });
      fireEvent.click(backButtons[0]);

      await waitFor(() => {
        const activeTabs = screen.getAllByRole('tab', { name: /Active/i });
        expect(activeTabs.length).toBe(2);
      });
    });

    // 64.12
    it('[US 1.37][US 1.39] shows "No responses yet." when discussion has no responses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText('No responses yet.')).toBeInTheDocument();
      });
    });
  });

  describe('Independent Pane Selection', () => {
    // 64.13
    it('[US 1.25][US 1.39] allows selecting different discussions in left and right panes', async () => {
      const disc2: DiscussionWithResponseCount = {
        ...mockDiscussion,
        id: 'discussion-second',
        prompt_text: 'What is the role of HTML in web development?',
        display_order: 1,
        response_count: 2,
      };
      const twoActiveDiscs = [activeDisc, disc2];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      render(<SplitView discussions={twoActiveDiscs} lessonId="lesson-456" onBack={onBack} />);

      const firstPrompts = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(firstPrompts[0]);

      const secondPrompts = screen.getAllByText(/What is the role of HTML/i);
      fireEvent.click(secondPrompts[0]);

      await waitFor(() => {
        expect(screen.getByText(mockDiscussion.prompt_text)).toBeInTheDocument();
        expect(screen.getByText('What is the role of HTML in web development?')).toBeInTheDocument();
      });
    });

    // 64.14
    it('[US 1.25][US 1.39] allows selecting the same discussion in both panes', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const promptsBefore = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(promptsBefore[0]);

      await waitFor(() => {
        const promptsAfter = screen.getAllByText(/What is the main purpose/i);
        expect(promptsAfter.length).toBeGreaterThanOrEqual(2);
        fireEvent.click(promptsAfter[promptsAfter.length - 1]);
      });

      await waitFor(() => {
        const fullPrompts = screen.getAllByText(mockDiscussion.prompt_text);
        expect(fullPrompts.length).toBe(2);
      });
    });
  });

  describe('Live Active Discussion Responses', () => {
    // 64.15
    it('[US 1.34] uses provided live responses for the active discussion', async () => {
      const { rerender } = render(
        <SplitView
          discussions={discussions}
          lessonId="lesson-456"
          onBack={onBack}
          liveActiveDiscussionId={activeDisc.id}
          liveActiveResponses={[]}
        />,
      );

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText('No responses yet.')).toBeInTheDocument();
      });

      rerender(
        <SplitView
          discussions={discussions}
          lessonId="lesson-456"
          onBack={onBack}
          liveActiveDiscussionId={activeDisc.id}
          liveActiveResponses={[
            {
              id: 'live-r1',
              discussion_id: activeDisc.id,
              response_text: 'This is a live response from session state.',
              created_at: new Date().toISOString(),
            } as any,
          ]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('This is a live response from session state.')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    // 64.16
    it('[US 1.37] shows loading text while fetching responses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(new Promise(() => {})),
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      expect(document.querySelector('.skeleton-shimmer')).toBeInTheDocument();
    });
  });
});
