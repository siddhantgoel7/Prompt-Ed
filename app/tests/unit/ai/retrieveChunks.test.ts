import { 
  retrieveChunksBySimilarity, 
  retrieveRecentChunks 
} from '@/lib/ai/retrieveChunks';

describe('retrieveChunks', () => {
    let mockSupabase: any;

    beforeEach(() => {
        mockSupabase = {
            rpc: jest.fn(),
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
    });

    describe('retrieveChunksBySimilarity', () => {
        it('success: returns mapped chunks from RPC', async () => {
             mockSupabase.rpc.mockResolvedValueOnce({
                data: [
                    { content: 'C1', metadata: { key: 'v1' }, similarity: 0.9 },
                    { content: 'C2', metadata: null, similarity: 0.8 }
                ],
                error: null
            });

            const result = await retrieveChunksBySimilarity('l1', [0.1], mockSupabase);

            expect(mockSupabase.rpc).toHaveBeenCalledWith('match_lesson_chunks', {
                p_lesson_id: 'l1',
                p_embedding: [0.1],
                p_match_count: 8
            });
            expect(result).toHaveLength(2);
            expect(result[0].content).toBe('C1');
            expect(result[0].metadata.key).toBe('v1');
            expect(result[1].metadata).toEqual({});
        });

        it('failure: returns empty array on RPC error', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Fail' } });
            
            const result = await retrieveChunksBySimilarity('l1', [0.1], mockSupabase);

            expect(result).toEqual([]);
        });

        it('failure: returns empty array on catch', async () => {
            mockSupabase.rpc.mockImplementationOnce(() => { throw new Error('Crash'); });
            
            const result = await retrieveChunksBySimilarity('l1', [0.1], mockSupabase);

            expect(result).toEqual([]);
        });
    });

    describe('retrieveRecentChunks', () => {
        it('success: returns mapped chunks using query builder', async () => {
            mockSupabase.limit.mockResolvedValueOnce({
                data: [
                    { content: 'Recent 1', metadata: { source: 'transcript' } }
                ],
                error: null
            });

            const result = await retrieveRecentChunks('l1', mockSupabase);

            expect(mockSupabase.from).toHaveBeenCalledWith('lesson_chunks');
            expect(result).toHaveLength(1);
            expect(result[0].content).toBe('Recent 1');
        });

        it('failure: returns empty array on query error', async () => {
            mockSupabase.limit.mockResolvedValueOnce({ data: null, error: { code: '42P01', message: 'Not Found' } });
            
            const result = await retrieveRecentChunks('l1', mockSupabase);

            expect(result).toEqual([]);
        });

        it('failure: returns empty array on catch', async () => {
            mockSupabase.from.mockImplementationOnce(() => { throw new Error('Query Crash'); });
            
            const result = await retrieveRecentChunks('l1', mockSupabase);

            expect(result).toEqual([]);
        });
    });
});
