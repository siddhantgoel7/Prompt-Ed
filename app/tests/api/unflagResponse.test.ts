// Tests for unflagResponseApi — restores a soft-deleted response by clearing flagged_at.

import { createClient } from '@/lib/supabase/client';
import { unflagResponseApi } from '@/lib/api/discussionsApi';

jest.mock('@/lib/supabase/client');

describe('unflagResponseApi', () => {
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

  // 49.1
  it('should call supabase update with flagged_at: null and the correct response ID', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: 'response-123' }], error: null });

    await unflagResponseApi('response-123');

    const supabase = createClient();
    expect(supabase.from).toHaveBeenCalledWith('responses');
    expect(mockUpdate).toHaveBeenCalledWith({ flagged_at: null });
    expect(mockEq).toHaveBeenCalledWith('id', 'response-123');
    expect(mockSelect).toHaveBeenCalled();
  });

  // 49.2
  it('should resolve successfully when update returns data', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: 'response-456' }], error: null });

    await expect(unflagResponseApi('response-456')).resolves.toBeUndefined();
  });

  // 49.3
  it('should throw when supabase returns an error', async () => {
    const supaError = { message: 'Row not found', code: 'PGRST116' };
    mockSelect.mockResolvedValue({ data: null, error: supaError });

    await expect(unflagResponseApi('response-bad')).rejects.toEqual(supaError);
  });

  // 49.4
  it('should throw when update affects 0 rows (RLS blocking)', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    await expect(unflagResponseApi('response-rls')).rejects.toThrow(
      /UPDATE RLS policy/
    );
  });
});
