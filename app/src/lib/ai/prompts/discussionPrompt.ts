// Prompt templates and configuration for AI-powered discussion question generation.
// Edit CANDIDATE_COUNT and the prompt text here to tune AI behavior without touching pipeline code.
import type { PromptType } from '@/types/discussion';
import type { AIPromptPreferences } from '@/types/ai';

/**
 * ============================================================
 * AI PROMPT CONFIGURATION — Edit this file to tune AI behavior
 * ============================================================
 *
 * CANDIDATE_COUNT: number of discussion candidates to generate per call.
 * Increase for more options; decrease for faster response time.
 */
export const CANDIDATE_COUNT = 5;

/**
 * The AI's persona and instructions.
 * Maps difficulty to explicit Bloom's taxonomy levels with pharmacology-specific guidance.
 *
 * @param promptType - When provided, only the few-shot example matching the requested type is
 *   included. This prevents the model from treating other question types as valid output formats
 *   (e.g., generating short_answer candidates when multiple_choice was requested).
 */
export function buildSystemPrompt(preferences?: AIPromptPreferences, promptType?: PromptType): string {
  const difficultyBlock = buildDifficultyBlock(preferences?.difficulty);
  const styleBlock = buildStyleBlock(preferences?.style);
  const fewShotExample = buildFewShotExample(promptType);

  return `You are an expert pharmacology teaching assistant helping a university instructor generate discussion questions for a live lecture.

<rules>
1. GROUNDING: Every question must be directly traceable to content in <context> or <transcript>. Do not introduce drug names, dosages, mechanisms, or clinical facts not mentioned in the provided content.
2. ACCURACY: Drug mechanisms must match the provided content exactly. Clinical scenarios must be medically plausible. Do not confuse drug classes or receptor subtypes.
3. COGNITIVE LEVEL: ${difficultyBlock}
4. STYLE: ${styleBlock}
5. AUDIENCE: University-level students in pharmacology or medical disciplines.
6. FORMAT: Questions must be clear, specific, and answerable within a 2-3 minute class discussion.
7. DIVERSITY: Vary topic, phrasing, and cognitive level across candidates — do not generate variations of the same question. Do NOT vary the question type — all candidates must use the type specified in <question_type_rules>.
8. QUESTION TYPE LOCK: ALL ${CANDIDATE_COUNT} candidates must use the exact promptType specified in <question_type_rules>. Producing any candidate of a different type is an error.
9. MC DISTRACTORS: For multiple_choice questions, distractors must be plausible — use common misconceptions, mechanisms that are partially correct under different conditions, or related-but-wrong drug classes. Never use trivially wrong or obviously absurd options.
10. OUTPUT: Respond with valid JSON only. Do not wrap in backticks or include any conversational text.
</rules>

<output_schema>
Each candidate object must include:
- "promptText": string — the discussion question
- "promptType": string — must match the type in <question_type_rules> for every candidate
- "bloomsLevel": one of "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create"
- "topicArea": string — the specific pharmacology topic this question addresses (e.g., "beta-blocker mechanism", "RAAS pathway")
- "rationale": string — one sentence explaining why this question is pedagogically valuable
- "mcOptions": (multiple_choice only) array of exactly 4 objects with "label", "text", "is_correct"
</output_schema>

<few_shot_examples>
${fewShotExample}
</few_shot_examples>`;
}

/**
 * Returns a single few-shot example matching the requested promptType.
 * Showing only the relevant example prevents the model from treating other types
 * as valid output formats (e.g., generating short_answer when multiple_choice was requested).
 * Falls back to short_answer for undefined/unknown types.
 */
function buildFewShotExample(promptType?: PromptType): string {
  switch (promptType) {
    case 'multiple_choice':
      return `Multiple choice example:
[{"promptText": "A patient taking propranolol reports cold extremities and fatigue. Which receptor mechanism best explains these side effects?", "promptType": "multiple_choice", "bloomsLevel": "apply", "topicArea": "beta-blocker adverse effects", "rationale": "Applies receptor pharmacology to a clinical presentation, distinguishing beta-1 from beta-2 effects.", "mcOptions": [{"label": "A", "text": "Competitive antagonism at beta-1 adrenergic receptors reduces cardiac output", "is_correct": false}, {"label": "B", "text": "Non-selective beta blockade reduces peripheral vasodilation via beta-2 inhibition", "is_correct": true}, {"label": "C", "text": "Alpha-1 blockade causes reflex tachycardia and peripheral vasoconstriction", "is_correct": false}, {"label": "D", "text": "Muscarinic M2 agonism slows conduction and reduces contractility", "is_correct": false}]}]`;
    case 'long_answer':
      return `Long answer example:
[{"promptText": "A patient is prescribed two drugs that act on the same receptor pathway. Explain the mechanistic basis for their potential interaction and how the combined pharmacodynamic effect differs from monotherapy.", "promptType": "long_answer", "bloomsLevel": "analyze", "topicArea": "drug interactions", "rationale": "Requires integrating two drug mechanisms to predict a combined effect, connecting pharmacodynamics to a clinical outcome."}]`;
    case 'short_answer':
    default:
      return `Short answer example:
[{"promptText": "Explain why a non-selective beta-blocker is contraindicated in a patient with asthma.", "promptType": "short_answer", "bloomsLevel": "understand", "topicArea": "beta-blocker contraindications", "rationale": "Tests understanding of receptor selectivity and its clinical consequences rather than pure recall."}]`;
  }
}

/** Maps difficulty preference to Bloom's taxonomy language with example question starters. */
function buildDifficultyBlock(difficulty?: string): string {
  switch (difficulty) {
    case 'basic':
      return 'Target the "remember" and "understand" levels of Bloom\'s taxonomy. Questions should test definitions, core mechanisms, and recall. Example starters: "What is...", "Name the...", "Define...", "Which receptor...".';
    case 'advanced':
      return 'Target the "analyze", "evaluate", and "create" levels of Bloom\'s taxonomy. Questions should require comparing drug classes, justifying clinical choices, reasoning through trade-offs, or predicting outcomes from mechanistic first principles. Example starters: "Evaluate which...", "Analyze the consequences...", "Compare and justify...", "Given these two mechanisms...".';
    default:
      return 'Target the "apply" and "analyze" levels of Bloom\'s taxonomy. Questions should connect mechanism to effect, interpret clinical scenarios, or work through moderate-complexity drug interactions. Example starters: "Explain why...", "How would...", "Given this mechanism...", "What would you expect if...".';
  }
}

/** Maps style preference to question framing guidance. */
function buildStyleBlock(style?: string): string {
  switch (style) {
    case 'factual':
      return 'Focus on direct recall and foundational facts. Questions should have clearly correct answers grounded in the lecture content.';
    case 'clinical_scenario':
      return 'Frame questions around clinical scenarios and patient cases. Embed the pharmacological concept inside a realistic patient presentation that students must interpret.';
    default:
      return 'Use a Socratic approach — encourage reasoning and questioning rather than pure recall. Questions should prompt students to work through the underlying logic.';
  }
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
  preferences?: AIPromptPreferences;
}): string {
  const { chunks, transcriptText, promptType, preferences } = params;

  const contextBlock = chunks.length > 0
    ? chunks.map((c, i) => `[Chunk ${i + 1}]\n${c}`).join('\n\n')
    : '(No file content available — generate from the transcript context only)';

  const transcriptBlock = transcriptText.trim()
    ? transcriptText.trim()
    : '(No transcript provided)';

  const typeInstructions = getTypeInstructions(promptType, preferences);

  const focusAreasBlock = preferences?.focusAreas?.trim()
    ? `\n<focus_areas>\nCraft at least 2 of the ${CANDIDATE_COUNT} questions to directly address these instructor-specified topics: ${preferences.focusAreas.trim()}\nThe remaining question(s) may draw from other relevant content in the lecture.\n</focus_areas>\n`
    : '';

  return `<instructions>
Based on the provided <context> and <transcript> from the lecture, generate exactly ${CANDIDATE_COUNT} discussion questions.${focusAreasBlock}

<diversity>
Vary the topic, cognitive level (Bloom's), and question structure across the ${CANDIDATE_COUNT} candidates. Do not generate variations of the same question.
</diversity>

<grounding>
Every question must be directly traceable to content in <context> or <transcript>. If a drug, mechanism, or clinical fact is not mentioned in the provided content, do not include it in any question.
</grounding>

<question_type_rules>
${typeInstructions}
</question_type_rules>

<output_format>
Respond with a JSON array containing exactly ${CANDIDATE_COUNT} objects.
Each object must strictly follow the output_schema in the system prompt — include "bloomsLevel", "topicArea", and "rationale" on every candidate.
${promptType === 'multiple_choice' ? `"mcOptions" must be an array of exactly 4 objects, each with:
  - "label": "A", "B", "C", or "D"
  - "text": string (the answer option)
  - "is_correct": boolean (exactly one must be true)` : ''}
</output_format>
</instructions>

<context>
${contextBlock}
</context>

<transcript>
${transcriptBlock}
</transcript>`;
}

/** Returns per-type generation rules injected into the user prompt. */
function getTypeInstructions(promptType: PromptType, preferences?: AIPromptPreferences): string {
  const lengthInstruction = preferences?.length === 'brief'
    ? ' Keep the question itself very brief and punchy.'
    : preferences?.length === 'detailed'
      ? ' The question should be detailed and provide substantial context before asking the core question.'
      : '';

  switch (promptType) {
    case 'multiple_choice':
      return `Each question must have exactly 4 answer options (A, B, C, D) with exactly one correct answer. Distractors must be plausible pharmacological misconceptions — not trivially wrong options.${lengthInstruction}`;
    case 'short_answer':
      return `Each question should be answerable in 1-2 sentences. Focus on key concepts, definitions, mechanisms, or brief explanations grounded in the lecture content.${lengthInstruction}`;
    case 'long_answer':
      return `Each question should invite a 2-5 sentence response. Focus on mechanisms, comparisons, drug interactions, or clinical reasoning that requires drawing on multiple concepts.${lengthInstruction}`;
  }
}
