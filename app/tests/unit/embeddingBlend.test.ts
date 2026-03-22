/**
 * Unit Tests — Embedding Blend Utilities
 * User Story [US 1.18]: AI prompt generation with preference-aware retrieval
 *
 * Tests the two pure utility functions exported from retrieveChunks.ts:
 *   - blendEmbeddings: weighted linear combination of two embedding vectors
 *   - normalizeEmbedding: L2-normalizes a vector for cosine similarity
 *
 * All functions are pure (no I/O, no DB), so no mocking is needed.
 */

import {
    blendEmbeddings,
    normalizeEmbedding,
} from '@/lib/ai/retrieveChunks';

// ---------------------------------------------------------------------------
// blendEmbeddings
// ---------------------------------------------------------------------------

describe('blendEmbeddings [US 1.18]', () => {
    // 30.1
    it('[US 1.18][UT1] success: 70/30 blend of [1,0] and [0,1] returns [0.7, 0.3]', () => {
        const result = blendEmbeddings([1, 0], [0, 1], 0.7);
        expect(result[0]).toBeCloseTo(0.7);
        expect(result[1]).toBeCloseTo(0.3);
    });

    // 30.2
    it('[US 1.18][UT2] success: alpha=1.0 returns vector a unchanged', () => {
        const a = [0.5, 0.5, 0.5];
        const b = [0.1, 0.2, 0.3];
        const result = blendEmbeddings(a, b, 1.0);
        expect(result).toEqual(a);
    });

    // 30.3
    it('[US 1.18][UT3] success: alpha=0.0 returns vector b unchanged', () => {
        const a = [0.5, 0.5, 0.5];
        const b = [0.1, 0.2, 0.3];
        const result = blendEmbeddings(a, b, 0.0);
        expect(result).toEqual(b);
    });

    // 30.4
    it('[US 1.18][UT4] failure: throws if vectors have different lengths', () => {
        expect(() => blendEmbeddings([1, 0], [0, 1, 0])).toThrow();
    });
});

// ---------------------------------------------------------------------------
// normalizeEmbedding
// ---------------------------------------------------------------------------

describe('normalizeEmbedding [US 1.18]', () => {
    // 30.5
    it('[US 1.18][UT5] success: unit vector [1,0] is unchanged', () => {
        const result = normalizeEmbedding([1, 0]);
        expect(result[0]).toBeCloseTo(1);
        expect(result[1]).toBeCloseTo(0);
    });

    // 30.6
    it('[US 1.18][UT6] success: [3,4] normalizes to [0.6, 0.8]', () => {
        const result = normalizeEmbedding([3, 4]);
        expect(result[0]).toBeCloseTo(0.6);
        expect(result[1]).toBeCloseTo(0.8);
    });

    // 30.7
    it('[US 1.18][UT7] success: zero vector returns zero vector without throwing', () => {
        const result = normalizeEmbedding([0, 0, 0]);
        expect(result).toEqual([0, 0, 0]);
    });
});

