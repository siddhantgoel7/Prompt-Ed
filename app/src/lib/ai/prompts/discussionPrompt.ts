import type { PromptType } from '@/types/discussion';

/**
 * ============================================================
 * AI PROMPT CONFIGURATION — Edit this file to tune AI behavior
 * ============================================================
 *
 * CANDIDATE_COUNT: number of discussion candidates to generate per call.
 * Increase for more options; decrease for faster response time.
 */
export const CANDIDATE_COUNT = 3;

/**
 * The AI's persona and instructions.
 * Edit to change how the AI frames discussion questions,
 * style, pharmacology-specific handling, etc.
 */
export function buildSystemPrompt(): string {
  return `You are an expert teaching assistant helping a university instructor generate discussion questions for a live lecture.

Your questions should:
- Be grounded in the provided lecture content and transcript
- Encourage critical thinking and deeper understanding of the material
- Be appropriate for university-level students
- Be clear, specific, and answerable within a few minutes of class discussion

Always respond with valid JSON only. No markdown, no explanation outside the JSON structure.`;
}

/**
 * Assembles the user message sent to gpt-4o-mini.
 * Uses XML tag delimiters around chunk content to prevent prompt injection.
 *
 * Structure:
 *   <context>[file chunks]</context>
 *   <transcript>[transcriptText or empty]</transcript>
 *   Generate CANDIDATE_COUNT {promptType} discussion questions...
 *
 * @see US 1.18, 1.19, 1.23
 */
export function buildUserPrompt(params: {
  chunks: string[];
  transcriptText: string;
  promptType: PromptType;
}): string {
  const { chunks, transcriptText, promptType } = params;

  const contextBlock = chunks.length > 0
    ? chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n')
    : '(No file content available — generate from the transcript context only)';

  const transcriptBlock = transcriptText.trim()
    ? transcriptText.trim()
    : '(No transcript provided)';

  const typeInstructions = getTypeInstructions(promptType);

  return `<context>
${contextBlock}
</context>

<transcript>
${transcriptBlock}
</transcript>

Generate exactly ${CANDIDATE_COUNT} discussion questions based on the lecture content above.

${typeInstructions}

Respond with a JSON array of exactly ${CANDIDATE_COUNT} objects. Each object must have:
- "promptText": string — the discussion question
- "promptType": "${promptType}"
${promptType === 'multiple_choice' ? `- "mcOptions": array of exactly 4 objects, each with:
  - "label": "A", "B", "C", or "D"
  - "text": string — the answer option text
  - "is_correct": boolean — exactly one option must be true` : ''}

Example format:
${getExampleJson(promptType)}`;
}

function getTypeInstructions(promptType: PromptType): string {
  switch (promptType) {
    case 'multiple_choice':
      return 'Each question must have exactly 4 answer options (A, B, C, D) with exactly one correct answer.';
    case 'short_answer':
      return 'Each question should be answerable in 1-2 sentences. Focus on key concepts, definitions, or brief explanations.';
    case 'long_answer':
      return 'Each question should invite a 2-5 sentence response. Focus on mechanisms, comparisons, reasoning, or analysis.';
  }
}

function getExampleJson(promptType: PromptType): string {
  if (promptType === 'multiple_choice') {
    return `[{"promptText": "Which receptor does drug X primarily target?", "promptType": "multiple_choice", "mcOptions": [{"label": "A", "text": "Beta-1 adrenergic", "is_correct": false}, {"label": "B", "text": "Muscarinic M2", "is_correct": true}, {"label": "C", "text": "Alpha-1 adrenergic", "is_correct": false}, {"label": "D", "text": "Nicotinic", "is_correct": false}]}]`;
  }
  return `[{"promptText": "Explain the mechanism of action of...", "promptType": "${promptType}"}]`;
}
