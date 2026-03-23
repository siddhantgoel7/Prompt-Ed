// Prompt templates for generating general multiple-choice questions from all uploaded course materials.
// These questions cover the breadth of the material and are intended for use throughout a lesson.
// Incorporates the same distractor strategies, Bloom's taxonomy, and output format as the
// discussion prompt pipeline (discussionPrompt.ts) for consistency.
import type { AIPromptPreferences } from '@/types/ai';

/** Number of general questions to generate per call. */
export const GENERAL_QUESTION_COUNT = 10;

/**
 * System prompt for general question generation.
 * Aligned with the discussion system prompt: Bloom's taxonomy difficulty mapping,
 * distractor strategy rules, and structured output schema.
 */
export function buildGeneralSystemPrompt(preferences?: AIPromptPreferences): string {
  const difficultyInstruction = preferences?.difficulty === 'basic'
    ? 'Target the "remember" and "understand" levels of Bloom\'s taxonomy. Questions should test definitions, core mechanisms, and recall.'
    : preferences?.difficulty === 'advanced'
      ? 'Target the "analyze", "evaluate", and "create" levels of Bloom\'s taxonomy. Questions should require comparing drug classes, justifying clinical choices, or reasoning through trade-offs.'
      : 'Target the "apply" and "analyze" levels of Bloom\'s taxonomy. Questions should connect mechanism to effect, interpret clinical scenarios, or work through moderate-complexity drug interactions.';

  return `You are an expert teaching assistant helping a university instructor generate a comprehensive set of multiple-choice questions from their uploaded course materials.

<rules>
1. GROUNDING: Questions must be strictly grounded in the provided lecture content. Do not introduce drug names, dosages, mechanisms, or clinical facts not present in the content.
2. COVERAGE: Questions should cover the BREADTH of the material — do not cluster questions around a single topic. Spread them across different concepts, sections, and themes present in the content.
3. COGNITIVE LEVEL: ${difficultyInstruction}
4. AUDIENCE: Appropriate for university-level students in medical/pharmacology disciplines.
5. FORMAT: Clear, specific multiple-choice questions with exactly 4 options and one correct answer.
6. MC DISTRACTORS: Each wrong answer must use one of these distractor strategies:
   (1) Mechanism confusion — correct drug or target, wrong receptor subtype, pathway step, or molecular mechanism
   (2) Location confusion — correct mechanism, wrong tissue, organ, or physiological compartment
   (3) Dose confusion — correct drug and mechanism, wrong dosing rationale or therapeutic window reasoning
   (4) Partial truth — statement that is true in a different context, for a related drug, or only under different conditions
   Each of the three distractors must use a different strategy. Never use trivially wrong or obviously absurd options.
7. MC ANSWER POSITION: Distribute the correct answer across different label positions (A, B, C, D) across the ${GENERAL_QUESTION_COUNT} questions. Avoid placing is_correct: true on the same label repeatedly.
8. OUTPUT: Always respond with valid JSON only. Do not wrap in backticks or include any conversational text.
</rules>

<output_schema>
Return a JSON object with a single top-level key "candidates" whose value is an array of question objects.
Each object must include:
- "promptText": string — the question
- "promptType": "multiple_choice" (literal string)
- "mcOptions": array of exactly 4 objects, each with:
  - "label": "A", "B", "C", or "D"
  - "text": string (the answer option text)
  - "is_correct": boolean (exactly one must be true)
</output_schema>`;
}

/**
 * User prompt for general question generation.
 * Provides all available chunks as context and asks for diverse, broad-coverage MC questions.
 */
export function buildGeneralUserPrompt(params: {
  chunks: string[];
  preferences?: AIPromptPreferences;
}): string {
  const { chunks, preferences } = params;

  const contextBlock = chunks.length > 0
    ? chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n')
    : '(No file content available)';

  const focusAreasBlock = preferences?.focusAreas?.trim()
    ? `\n<focus_areas>\nCraft at least 3 of the ${GENERAL_QUESTION_COUNT} questions to directly address these instructor-specified topics: ${preferences.focusAreas.trim()}\nThe remaining questions should draw from other relevant content to ensure breadth.\n</focus_areas>\n`
    : '';

  return `<instructions>
Based on the provided <context> from the course materials, generate exactly ${GENERAL_QUESTION_COUNT} multiple-choice questions that cover the breadth of the material.${focusAreasBlock}

<question_type_rules>
Each question must have exactly 4 answer options (A, B, C, D) with exactly one correct answer. Distractors must be plausible pharmacological misconceptions — not trivially wrong options. Questions should be diverse, covering different topics and concepts from the material. Avoid asking multiple questions about the same narrow topic.
</question_type_rules>

<diversity>
Vary the topic and cognitive level across the ${GENERAL_QUESTION_COUNT} questions. Do not generate variations of the same question.
</diversity>

<output_format>
Respond with a JSON object: { "candidates": [ ... ] } containing exactly ${GENERAL_QUESTION_COUNT} objects.
Each object must include "promptText", "promptType", and "mcOptions" as described in the output_schema.
</output_format>

<example>
{"candidates": [{"promptText": "Which receptor does drug X primarily target?", "promptType": "multiple_choice", "mcOptions": [{"label": "A", "text": "Beta-1 adrenergic", "is_correct": false}, {"label": "B", "text": "Muscarinic M2", "is_correct": true}, {"label": "C", "text": "Alpha-1 adrenergic", "is_correct": false}, {"label": "D", "text": "Nicotinic", "is_correct": false}]}]}
</example>
</instructions>

<context>
${contextBlock}
</context>`;
}
