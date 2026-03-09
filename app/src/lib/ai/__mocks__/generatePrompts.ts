import type { PromptType } from '@/types/discussion';
import type { CandidateSet, AIPromptPreferences } from '@/types/ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../providers';

/**
 * Mock for development without OpenAI API key and demo-day fallback.
 * Enable: set MOCK_AI=true in .env.local
 * Returns instant hardcoded CandidateSet with realistic pharmacology prompts.
 * Same function signature as generatePrompts.ts — drop-in replacement.
 */
export async function generatePrompts(
  _lessonId: string,
  _transcriptText: string,
  promptType: PromptType,
  _supabase?: SupabaseClient | null,
  _aiProvider?: AIProvider | null,
  _preferences?: AIPromptPreferences
): Promise<CandidateSet> {
  if (promptType === 'multiple_choice') {
    return {
      candidates: [
        {
          promptText: 'Which of the following best describes the mechanism of action of beta-blockers?',
          promptType: 'multiple_choice',
          mcOptions: [
            { label: 'A', text: 'Block calcium channels in cardiac muscle' },
            { label: 'B', text: 'Competitively antagonize catecholamines at beta-adrenergic receptors' },
            { label: 'C', text: 'Activate alpha-1 receptors to increase heart rate' },
            { label: 'D', text: 'Inhibit ACE to reduce angiotensin II production' },
          ],
        },
        {
          promptText: 'Which drug class is first-line therapy for heart failure with reduced ejection fraction?',
          promptType: 'multiple_choice',
          mcOptions: [
            { label: 'A', text: 'Calcium channel blockers' },
            { label: 'B', text: 'Nitrates' },
            { label: 'C', text: 'ACE inhibitors' },
            { label: 'D', text: 'Alpha-blockers' },
          ],
        },
        {
          promptText: 'What is the primary pharmacological target of statins?',
          promptType: 'multiple_choice',
          mcOptions: [
            { label: 'A', text: 'Cholesterol absorption in the gut' },
            { label: 'B', text: 'HMG-CoA reductase enzyme' },
            { label: 'C', text: 'LDL receptor degradation' },
            { label: 'D', text: 'PCSK9 protein' },
          ],
        },
      ],
      warning: 'Mock mode active (MOCK_AI=true). Set MOCK_AI=false to use real OpenAI generation.',
    };
  }

  if (promptType === 'short_answer') {
    return {
      candidates: [
        {
          promptText: 'What is the difference between pharmacokinetics and pharmacodynamics?',
          promptType: 'short_answer',
        },
        {
          promptText: 'Define the therapeutic index and explain its clinical significance.',
          promptType: 'short_answer',
        },
        {
          promptText: 'What is a drug-drug interaction? Give one clinical example.',
          promptType: 'short_answer',
        },
      ],
      warning: 'Mock mode active (MOCK_AI=true). Set MOCK_AI=false to use real OpenAI generation.',
    };
  }

  return {
    candidates: [
      {
        promptText: 'Explain how competitive antagonism differs from non-competitive antagonism. How does each affect the dose-response curve?',
        promptType: 'long_answer',
      },
      {
        promptText: 'A patient is prescribed warfarin and begins taking ibuprofen. What pharmacological interactions would you expect, and what monitoring would you recommend?',
        promptType: 'long_answer',
      },
      {
        promptText: 'Compare the mechanisms of action of ACE inhibitors and ARBs. In what clinical situations might you prefer one over the other?',
        promptType: 'long_answer',
      },
    ],
    warning: 'Mock mode active (MOCK_AI=true). Set MOCK_AI=false to use real OpenAI generation.',
  };
}
