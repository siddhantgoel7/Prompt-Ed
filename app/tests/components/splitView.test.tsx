import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SplitView } from '@/components/instructor/session/SplitView';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import { createMockRealtimeChannel } from '../../jest.setup';
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
jest.mock('@/lib/realtime/useRealtime');

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
  let mockChannel: ReturnType<typeof createMockRealtimeChannel>;
  let mockSupabase: any;
  const onBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = createMockRealtimeChannel();
    (useRealtime as jest.Mock).mockReturnValue({
      channel: mockChannel,
      isConnected: true,
    });

    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Layout and Navigation', () => {
    it('renders full-screen overlay with back button and title', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      expect(screen.getByText('Split View')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Session/i })).toBeInTheDocument();
    });

    it('calls onBack when "Back to Session" is clicked', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: /Back to Session/i }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('renders left and right pane labels', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
    });
  });

  describe('Discussion Selection', () => {
    it('shows active and closed tabs in each pane', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Both panes should have Active/Closed tabs
      const activeTabs = screen.getAllByRole('tab', { name: /Active/i });
      const closedTabs = screen.getAllByRole('tab', { name: /Closed/i });
      expect(activeTabs).toHaveLength(2); // one per pane
      expect(closedTabs).toHaveLength(2);
    });

    it('displays active discussion cards with prompt text and response count', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Active discussion prompt should appear in both panes
      const prompts = screen.getAllByText(/What is the main purpose/i);
      expect(prompts.length).toBeGreaterThanOrEqual(2);

      // Response count badge
      const counts = screen.getAllByText('3');
      expect(counts.length).toBeGreaterThanOrEqual(2);
    });

    it('renders closed tab with correct count', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Both panes should show Closed tab with count
      const closedTabs = screen.getAllByRole('tab', { name: /Closed \(1\)/i });
      expect(closedTabs).toHaveLength(2);
    });

    it('shows status badges on discussion cards', () => {
      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('handles empty discussion list gracefully', () => {
      render(<SplitView discussions={[]} lessonId="lesson-456" onBack={onBack} />);

      const noDiscussions = screen.getAllByText(/No discussions/i);
      expect(noDiscussions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Discussion Detail View', () => {
    it('shows discussion detail with prompt and back button after selecting a discussion', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockResponse, mockResponse2],
              error: null,
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Click the first discussion card (in left pane)
      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      // Should show back button inside the pane
      await waitFor(() => {
        // The pane-level back button (not the top-bar one)
        const backButtons = screen.getAllByRole('button', { name: /Back/i });
        expect(backButtons.length).toBeGreaterThanOrEqual(2); // top bar + pane
      });

      // Full prompt text visible (appears in detail view + right pane card)
      const promptElements = screen.getAllByText(mockDiscussion.prompt_text);
      expect(promptElements.length).toBeGreaterThanOrEqual(1);
    });

    it('fetches responses from Supabase when discussion is selected', async () => {
      const responsesData = createMockResponses('discussion-123', 3);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: responsesData,
              error: null,
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Select discussion in left pane
      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('responses');
      });

      // Responses should appear
      await waitFor(() => {
        expect(screen.getByText('Student response #1 to the discussion prompt.')).toBeInTheDocument();
        expect(screen.getByText('Student response #2 to the discussion prompt.')).toBeInTheDocument();
        expect(screen.getByText('Student response #3 to the discussion prompt.')).toBeInTheDocument();
      });
    });

    it('returns to discussion list when pane back button is clicked', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Select a discussion
      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      // Wait for detail view to appear (loading or no responses)
      await waitFor(() => {
        const backButtons = screen.getAllByRole('button', { name: /^Back$/i });
        expect(backButtons.length).toBeGreaterThanOrEqual(1);
      });

      // Click pane-level back (the one with just "Back" text)
      const backButtons = screen.getAllByRole('button', { name: /^Back$/i });
      fireEvent.click(backButtons[0]);

      // Should return to discussion list (active tab visible again)
      await waitFor(() => {
        const activeTabs = screen.getAllByRole('tab', { name: /Active/i });
        expect(activeTabs.length).toBe(2);
      });
    });

    it('shows "No responses yet." when discussion has no responses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
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
    it('allows selecting different discussions in left and right panes', async () => {
      // Use two active discussions so both appear in the default Active tab
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
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<SplitView discussions={twoActiveDiscs} lessonId="lesson-456" onBack={onBack} />);

      // Select first discussion in left pane
      const firstPrompts = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(firstPrompts[0]); // left pane

      // Select second discussion in right pane
      const secondPrompts = screen.getAllByText(/What is the role of HTML/i);
      fireEvent.click(secondPrompts[0]); // right pane

      // Both discussion prompts should be visible in detail views
      await waitFor(() => {
        expect(screen.getByText(mockDiscussion.prompt_text)).toBeInTheDocument();
        expect(screen.getByText('What is the role of HTML in web development?')).toBeInTheDocument();
      });
    });

    it('allows selecting the same discussion in both panes', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Select the same discussion in left pane first
      const promptsBefore = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(promptsBefore[0]); // left pane switches to detail

      // Now the right pane still shows the list — click the same discussion there
      await waitFor(() => {
        const promptsAfter = screen.getAllByText(/What is the main purpose/i);
        // Should have at least 2: one in left detail (full text) and one in right list (truncated)
        expect(promptsAfter.length).toBeGreaterThanOrEqual(2);
        // Click the one still in the right pane list
        fireEvent.click(promptsAfter[promptsAfter.length - 1]);
      });

      // Both panes should now show detail view with the full prompt text
      await waitFor(() => {
        const fullPrompts = screen.getAllByText(mockDiscussion.prompt_text);
        expect(fullPrompts.length).toBe(2); // one in each pane
      });
    });
  });

  describe('Real-time Response Updates', () => {
    it('receives real-time responses for the selected discussion', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Select discussion in left pane
      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText('No responses yet.')).toBeInTheDocument();
      });

      // Simulate real-time response broadcast
      mockChannel._trigger('response:new', {
        response: {
          id: 'realtime-resp-1',
          discussion_id: 'discussion-123',
          response_text: 'This is a real-time response!',
          created_at: new Date().toISOString(),
        },
      });

      await waitFor(() => {
        expect(screen.getByText('This is a real-time response!')).toBeInTheDocument();
      });
    });

    it('ignores real-time responses for a different discussion', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      // Select discussion-123 in left pane
      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText('No responses yet.')).toBeInTheDocument();
      });

      // Broadcast response for a different discussion
      mockChannel._trigger('response:new', {
        response: {
          id: 'other-resp',
          discussion_id: 'discussion-other',
          response_text: 'Should not appear',
          created_at: new Date().toISOString(),
        },
      });

      // The "No responses yet." should still be there
      // Use a short delay to confirm nothing changed
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByText('No responses yet.')).toBeInTheDocument();
      expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
    });

    it('deduplicates real-time responses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [mockResponse],
              error: null,
            }),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      await waitFor(() => {
        expect(screen.getByText(mockResponse.response_text)).toBeInTheDocument();
      });

      // Broadcast the same response again
      mockChannel._trigger('response:new', { response: mockResponse });

      await new Promise((r) => setTimeout(r, 50));
      // Should still only have one instance
      const matches = screen.getAllByText(mockResponse.response_text);
      expect(matches).toHaveLength(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading text while fetching responses', async () => {
      // Make the Supabase call hang (never resolve)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      });

      render(<SplitView discussions={discussions} lessonId="lesson-456" onBack={onBack} />);

      const cards = screen.getAllByText(/What is the main purpose/i);
      fireEvent.click(cards[0]);

      expect(screen.getByText('Loading responses...')).toBeInTheDocument();
    });
  });
});
