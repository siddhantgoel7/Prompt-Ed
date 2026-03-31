// Tests for fetchFlaggedResponsesApi — fetches soft-deleted responses for a discussion.

import { createClient } from '@/lib/supabase/client';
import { fetchFlaggedResponsesApi } from '@/lib/api/discussionsApi';

jest.mock('@/lib/supabase/client');

describe('fetchFlaggedResponsesApi', () => {
  let mockOrder: jest.Mock;
  let mockNot: jest.Mock;
  let mockEq: jest.Mock;
  let mockSelect: jest.Mock;

  beforeEach(() => {
    mockOrder = jest.fn();
    mockNot = jest.fn().mockReturnValue({ order: mockOrder });
    mockEq = jest.fn().mockReturnValue({ not: mockNot });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 48.1
  it('should return empty array when discussionId is null', async () => {
    const result = await fetchFlaggedResponsesApi(null);
    expect(result).toEqual([]);
  });

  // 48.2
  it('should call supabase with .not("flagged_at", "is", null) filter', async () => {
    const mockData = [
      {
        id: 'r1',
        discussion_id: 'disc-1',
        response_text: 'Flagged response',
        created_at: '2024-01-01T10:00:00Z',
        selected_option: null,
        is_correct: null,
        flagged_at: '2024-01-01T11:00:00Z',
        student_session_id: 'student-1',
      },
    ];
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const result = await fetchFlaggedResponsesApi('disc-1');

    const supabase = createClient();
    expect(supabase.from).toHaveBeenCalledWith('responses');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('discussion_id', 'disc-1');
    expect(mockNot).toHaveBeenCalledWith('flagged_at', 'is', null);
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toEqual(mockData);
  });

  // 48.3
  it('should return empty array on error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'Something went wrong' } });

    const result = await fetchFlaggedResponsesApi('disc-1');
    expect(result).toEqual([]);
  });

  // 48.4
  it('should return empty array when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const result = await fetchFlaggedResponsesApi('disc-1');
    expect(result).toEqual([]);
  });
});
