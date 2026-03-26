import { blendEmbeddings, normalizeEmbedding } from '@/lib/ai/retrieveChunks';
import { embedChunks } from '@/lib/ai/embedChunks';
import type { AIProvider } from '@/lib/ai/providers';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('retrieveChunks Utility Logic', () => {
    describe('blendEmbeddings', () => {
        it('success: blends two vectors correctly with default alpha', () => {
            const a = [1, 2];
            const b = [3, 4];
            // 0.7*1 + 0.3*3 = 0.7 + 0.9 = 1.6
            // 0.7*2 + 0.3*4 = 1.4 + 1.2 = 2.6
            const result = blendEmbeddings(a, b);
            expect(result[0]).toBeCloseTo(1.6);
            expect(result[1]).toBeCloseTo(2.6);
        });

        it('failure: throws on length mismatch', () => {
            expect(() => blendEmbeddings([1], [1, 2])).toThrow('vector length mismatch');
        });
    });

    describe('normalizeEmbedding', () => {
        it('success: normalizes a vector to unit length', () => {
            const v = [3, 4]; // norm = sqrt(9+16) = 5
            const result = normalizeEmbedding(v);
            expect(result[0]).toBe(0.6);
            expect(result[1]).toBe(0.8);
            
            // verify result is unit length
            const norm = Math.sqrt(result[0]**2 + result[1]**2);
            expect(norm).toBeCloseTo(1);
        });

        it('success: handles zero vector without divide-by-zero', () => {
            const v = [0, 0];
            const result = normalizeEmbedding(v);
            expect(result).toEqual([0, 0]);
        });
    });
});

describe('embedChunks', () => {
  let mockSupabase: any;
  let mockAI: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    mockAI = {
      generateEmbedding: jest.fn().mockResolvedValue([[0.1, 0.2]]),
    };
  });

  it('success: generates and stores embeddings in parallel', async () => {
    const chunks = [{ id: 'c1', content: 'test content' }];
    await embedChunks(chunks, mockSupabase, mockAI);

    expect(mockAI.generateEmbedding).toHaveBeenCalledWith(['test content']);
    expect(mockSupabase.update).toHaveBeenCalledWith({ embedding: "[0.1,0.2]" });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'c1');
  });

  it('failure: throws when AIProvider fails', async () => {
    mockAI.generateEmbedding.mockRejectedValue(new Error('AI Error'));
    await expect(embedChunks([{ id: 'c1', content: 'c' }], mockSupabase, mockAI))
      .rejects.toThrow('AI Error');
  });

  it('failure: throws when Supabase update fails', async () => {
    mockSupabase.eq.mockResolvedValue({ error: { message: 'DB Error', code: 'P0001' } } as any);
    await expect(embedChunks([{ id: 'c1', content: 'c' }], mockSupabase, mockAI))
      .rejects.toThrow('Failed to store embeddings: DB Error');
  });
});
