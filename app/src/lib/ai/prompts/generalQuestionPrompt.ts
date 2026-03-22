// Prompt templates for generating general multiple-choice questions from all uploaded course materials.
// These questions cover the breadth of the material and are intended for use throughout a lesson.
import type { AIPromptPreferences } from '@/types/ai';

/** Number of general questions to generate per call. */
export const GENERAL_QUESTION_COUNT = 10;

/**
 * System prompt for general question generation.
 * Similar to the discussion prompt but oriented toward broad material coverage.
 */
export function buildGeneralSystemPrompt(preferences?: AIPromptPreferences): string {
  const difficultyInstruction = preferences?.difficulty === 'basic'
    ? 'Keep questions simple, testing basic understanding and core concepts.'
    : preferences?.difficulty === 'advanced'
      ? 'Make questions challenging, testing critical analysis, nuanced comparisons, and deep mechanisms.'
      : 'Make questions intermediate level, focusing on practical application and moderate complexity.';

  return `You are an expert teaching assistant helping a university instructor generate a comprehensive set of multiple-choice questions from their uploaded course materials.

<rules>
1. Grounding: Questions must be strictly grounded in the provided lecture content.
2. Coverage: Questions should cover the BREADTH of the material — do not cluster questions around a single topic. Spread them across different concepts, sections, and themes present in the content.
3. Cognitive Level: Encourage critical thinking, application, and deeper understanding. ${difficultyInstruction}
4. Audience: Appropriate for university-level students in medical/pharmacology disciplines.
5. Format: Clear, specific multiple-choice questions with exactly 4 options and one correct answer.
6. Output: Always respond with valid JSON only. Do not wrap in backticks or include any conversational text.
</rules>`;
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
    ? `\n<focus_areas>\nThe instructor specifically requested to focus on: ${preferences.focusAreas.trim()}\n</focus_areas>\n`
    : '';

  return `<instructions>
Based on the provided <context> from the course materials, generate exactly ${GENERAL_QUESTION_COUNT} multiple-choice questions that cover the breadth of the material.${focusAreasBlock}

<question_type_rules>
Each question must have exactly 4 answer options (A, B, C, D) with exactly one correct answer. Questions should be diverse, covering different topics and concepts from the material. Avoid asking multiple questions about the same narrow topic.
</question_type_rules>

<output_format>
Respond with a JSON array containing exactly ${GENERAL_QUESTION_COUNT} objects.
Each object must strictly align with this schema:
- "promptText": string (the question)
- "promptType": "multiple_choice" (literal string)
- "mcOptions": array of exactly 4 objects, each with:
  - "label": "A", "B", "C", or "D"
  - "text": string (the answer option text)
  - "is_correct": boolean (exactly one option must be true)
</output_format>

<example>
[{"promptText": "Which receptor does drug X primarily target?", "promptType": "multiple_choice", "mcOptions": [{"label": "A", "text": "Beta-1 adrenergic", "is_correct": false}, {"label": "B", "text": "Muscarinic M2", "is_correct": true}, {"label": "C", "text": "Alpha-1 adrenergic", "is_correct": false}, {"label": "D", "text": "Nicotinic", "is_correct": false}]}]
</example>
</instructions>

<context>
${contextBlock}
</context>`;
}
