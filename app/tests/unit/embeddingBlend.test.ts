/**
 * Unit Tests — Embedding Blend Utilities
 * User Story [US 1.17][US 1.18]: AI prompt generation with preference-aware retrieval
 *
 * Tests the four pure utility functions exported from retrieveChunks.ts:
 *   - blendEmbeddings: weighted linear combination of two embedding vectors
 *   - normalizeEmbedding: L2-normalizes a vector for cosine similarity
 *   - parseKeywords: parses comma-separated preference strings
 *   - filterExcludedChunks: post-fetch exclusion filter for retrieved chunks
 *
 * All functions are pure (no I/O, no DB), so no mocking is needed.
 */

import {
    blendEmbeddings,
    normalizeEmbedding,
    parseKeywords,
    filterExcludedChunks,
    RetrievedChunk,
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

// ---------------------------------------------------------------------------
// parseKeywords
// ---------------------------------------------------------------------------

describe('parseKeywords [US 1.17]', () => {
    // 30.8
    it('[US 1.17][UT8] success: splits comma-separated string and trims whitespace', () => {
        expect(parseKeywords('beta blockers, RAAS, adverse effects')).toEqual([
            'beta blockers',
            'raas',
            'adverse effects',
        ]);
    });

    // 30.9
    it('[US 1.17][UT9] failure: filters out empty strings and single-character tokens', () => {
        expect(parseKeywords('a,, ,beta blockers')).toEqual(['beta blockers']);
    });

    // 30.10
    it('[US 1.17][UT10] failure: returns empty array for blank input', () => {
        expect(parseKeywords('')).toEqual([]);
        expect(parseKeywords('   ')).toEqual([]);
    });

    // 30.11
    it('[US 1.17][UT11] success: lowercases all tokens', () => {
        const result = parseKeywords('Beta Blockers, RAAS');
        expect(result).toEqual(['beta blockers', 'raas']);
    });
});

// ---------------------------------------------------------------------------
// filterExcludedChunks
// ---------------------------------------------------------------------------

const makeChunk = (content: string): RetrievedChunk => ({ content, metadata: {} });

describe('filterExcludedChunks [US 1.17]', () => {
    const chunks: RetrievedChunk[] = [
        makeChunk('Beta-blocker mechanisms reduce heart rate via receptor binding'),
        makeChunk('Clinical trials showed adverse outcomes in elderly patients'),
        makeChunk('RAAS pathway regulates blood pressure through angiotensin II'),
    ];

    // 30.12
    it('[US 1.17][UT12] success: removes chunks containing an exclusion keyword (case-insensitive)', () => {
        const result = filterExcludedChunks(chunks, 'clinical trials');
        expect(result).toHaveLength(2);
        expect(result.every((c) => !c.content.toLowerCase().includes('clinical trials'))).toBe(true);
    });

    // 30.13
    it('[US 1.17][UT13] success: keeps chunks with no matching keyword', () => {
        const result = filterExcludedChunks(chunks, 'dosage calculations');
        expect(result).toHaveLength(3);
    });

    // 30.14
    it('[US 1.17][UT14] success: returns original array unchanged when excludeAreas is undefined', () => {
        const result = filterExcludedChunks(chunks, undefined);
        expect(result).toHaveLength(3);
    });

    // 30.15
    it('[US 1.17][UT15] success: returns original array unchanged when excludeAreas is empty string', () => {
        const result = filterExcludedChunks(chunks, '');
        expect(result).toHaveLength(3);
    });

    // 30.16
    it('[US 1.17][UT16] success: handles multiple exclusion keywords (comma-separated)', () => {
        const result = filterExcludedChunks(chunks, 'clinical trials, RAAS');
        expect(result).toHaveLength(1);
        expect(result[0].content).toContain('Beta-blocker');
    });
});
