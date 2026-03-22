// Tests for flagResponseApi — soft-deletes a student response flagged as inappropriate.

import { createClient } from '@/lib/supabase/client';
import { flagResponseApi } from '@/lib/api/discussionsApi';

jest.mock('@/lib/supabase/client');

describe('flagResponseApi', () => {
  let mockUpdate: jest.Mock;
  let mockEq: jest.Mock;
  let mockSelect: jest.Mock;

  beforeEach(() => {
    mockSelect = jest.fn();
    mockEq = jest.fn().mockReturnValue({ select: mockSelect });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        update: mockUpdate,
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // 50.1
  it('should call supabase update with flagged_at and the correct response ID', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: 'response-123' }], error: null });

    await flagResponseApi('response-123');

    const supabase = createClient();
    expect(supabase.from).toHaveBeenCalledWith('responses');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ flagged_at: expect.any(String) })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'response-123');
    expect(mockSelect).toHaveBeenCalled();
  });

  // 50.2
  it('should resolve successfully when update returns data', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: 'response-456' }], error: null });

    await expect(flagResponseApi('response-456')).resolves.toBeUndefined();
  });

  // 50.3
  it('should throw when supabase returns an error', async () => {
    const supaError = { message: 'Row not found', code: 'PGRST116' };
    mockSelect.mockResolvedValue({ data: null, error: supaError });

    await expect(flagResponseApi('response-bad')).rejects.toEqual(supaError);
  });

  // 50.4
  it('should throw when update affects 0 rows (RLS blocking)', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    await expect(flagResponseApi('response-rls')).rejects.toThrow(
      /UPDATE RLS policy/
    );
  });
});
