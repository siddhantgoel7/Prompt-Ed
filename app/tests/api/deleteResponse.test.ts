// Tests for deleteResponseApi — removes a student response flagged as inappropriate.

import { createClient } from '@/lib/supabase/client';
import { deleteResponseApi } from '@/lib/api/discussionsApi';

jest.mock('@/lib/supabase/client');

describe('deleteResponseApi', () => {
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;

  beforeEach(() => {
    mockEq = jest.fn();
    mockDelete = jest.fn().mockReturnValue({ eq: mockEq });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        delete: mockDelete,
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call supabase delete with the correct response ID', async () => {
    mockEq.mockResolvedValue({ error: null });

    await deleteResponseApi('response-123');

    const supabase = createClient();
    expect(supabase.from).toHaveBeenCalledWith('responses');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'response-123');
  });

  it('should resolve successfully when no error occurs', async () => {
    mockEq.mockResolvedValue({ error: null });

    await expect(deleteResponseApi('response-456')).resolves.toBeUndefined();
  });

  it('should throw when supabase returns an error', async () => {
    const supaError = { message: 'Row not found', code: 'PGRST116' };
    mockEq.mockResolvedValue({ error: supaError });

    await expect(deleteResponseApi('response-bad')).rejects.toEqual(supaError);
  });
});
