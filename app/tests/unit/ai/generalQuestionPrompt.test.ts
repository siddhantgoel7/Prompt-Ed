/**
 * Unit Tests — General Question Prompt Templates
 * Covers US 1.51 (Generate general questions from course materials)
 *
 * AC1: Generate 10 MC questions from uploaded materials
 * AC2: Publish general questions to students
 * AC3: Regenerate replaces previous set
 *
 * Tests verify the prompt-building functions produce correct output:
 *   1. System prompt includes coverage and MC-specific instructions
 *   2. User prompt includes all chunks, correct count, and JSON schema
 *   3. Preferences (difficulty, focus areas) are injected correctly
 *
 * All tests are pure function tests — no mocks needed.
 */

import {
  buildGeneralSystemPrompt,
  buildGeneralUserPrompt,
  GENERAL_QUESTION_COUNT,
} from '@/lib/ai/prompts/generalQuestionPrompt';
import type { AIPromptPreferences } from '@/types/ai';

describe('General Question Prompt — buildGeneralSystemPrompt [US 1.51]', () => {

  // 47.1
  it('[US 1.51][AC1-AT1] success: includes breadth-of-material coverage instruction', () => {
    const prompt = buildGeneralSystemPrompt();
    expect(prompt).toContain('BREADTH');
    expect(prompt).toContain('multiple-choice');
  });

  // 47.2
  it('[US 1.51][AC1-AT2] success: applies basic difficulty when preference is set', () => {
    const prefs: AIPromptPreferences = {
      difficulty: 'basic',
      style: 'factual',
      length: 'standard',
    };
    const prompt = buildGeneralSystemPrompt(prefs);
    expect(prompt).toContain('simple');
    expect(prompt).toContain('core concepts');
  });

  // 47.3
  it('[US 1.51][AC1-AT3] success: applies advanced difficulty when preference is set', () => {
    const prefs: AIPromptPreferences = {
      difficulty: 'advanced',
      style: 'factual',
      length: 'standard',
    };
    const prompt = buildGeneralSystemPrompt(prefs);
    expect(prompt).toContain('challenging');
    expect(prompt).toContain('critical analysis');
  });

  // 47.4
  it('[US 1.51][AC1-AT4] success: defaults to intermediate difficulty when no preference is set', () => {
    const prompt = buildGeneralSystemPrompt();
    expect(prompt).toContain('intermediate');
  });
});

describe('General Question Prompt — buildGeneralUserPrompt [US 1.51]', () => {
  const SAMPLE_CHUNKS = [
    'Beta-blockers competitively antagonize catecholamines at beta-adrenergic receptors.',
    'Statins inhibit HMG-CoA reductase, reducing cholesterol synthesis.',
    'ACE inhibitors prevent conversion of angiotensin I to angiotensin II.',
  ];

  // 47.5
  it('[US 1.51][AC1-AT5] success: includes all provided chunks in the context block', () => {
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS });
    expect(prompt).toContain('[Chunk 1]');
    expect(prompt).toContain('[Chunk 2]');
    expect(prompt).toContain('[Chunk 3]');
    expect(prompt).toContain('Beta-blockers');
    expect(prompt).toContain('Statins');
    expect(prompt).toContain('ACE inhibitors');
  });

  // 47.6
  it('[US 1.51][AC1-AT6] success: requests exactly GENERAL_QUESTION_COUNT questions', () => {
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS });
    expect(prompt).toContain(`exactly ${GENERAL_QUESTION_COUNT}`);
  });

  // 47.7
  it('[US 1.51][AC1-AT7] success: specifies multiple_choice prompt type in the output format', () => {
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS });
    expect(prompt).toContain('"promptType": "multiple_choice"');
    expect(prompt).toContain('"mcOptions"');
    expect(prompt).toContain('"is_correct"');
  });

  // 47.8
  it('[US 1.51][AC1-AT8] success: includes JSON array output format with labels A/B/C/D', () => {
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS });
    expect(prompt).toContain('"label": "A"');
    expect(prompt).toContain('"label": "B"');
    expect(prompt).toContain('"label": "C"');
    expect(prompt).toContain('"label": "D"');
  });

  // 47.9
  it('[US 1.51][AC1-AT9] success: includes focus areas when provided in preferences', () => {
    const prefs: AIPromptPreferences = {
      difficulty: 'intermediate',
      style: 'factual',
      length: 'standard',
      focusAreas: 'pharmacokinetics and drug metabolism',
    };
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS, preferences: prefs });
    expect(prompt).toContain('<focus_areas>');
    expect(prompt).toContain('pharmacokinetics and drug metabolism');
  });

  // 47.10
  it('[US 1.51][AC1-AT10] success: omits focus areas block when no focus areas in preferences', () => {
    const prefs: AIPromptPreferences = {
      difficulty: 'intermediate',
      style: 'factual',
      length: 'standard',
    };
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS, preferences: prefs });
    expect(prompt).not.toContain('<focus_areas>');
  });

  // 47.11
  it('[US 1.51][AC1-AT11] failure: handles empty chunks with fallback message', () => {
    const prompt = buildGeneralUserPrompt({ chunks: [] });
    expect(prompt).toContain('No file content available');
  });

  // 47.12
  it('[US 1.51][AC1-AT12] success: includes diversity instruction to avoid topic clustering', () => {
    const prompt = buildGeneralUserPrompt({ chunks: SAMPLE_CHUNKS });
    expect(prompt).toContain('diverse');
    expect(prompt).toContain('different topics');
  });
});

describe('General Question Prompt — GENERAL_QUESTION_COUNT constant [US 1.51]', () => {

  // 47.13
  it('[US 1.51][AC1-AT13] success: GENERAL_QUESTION_COUNT is set to 10', () => {
    expect(GENERAL_QUESTION_COUNT).toBe(10);
  });
});
