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
          bloomsLevel: 'understand',
          topicArea: 'beta-blocker mechanism',
          rationale: 'Tests understanding of adrenergic receptor pharmacology rather than pure recall of drug names.',
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
          bloomsLevel: 'remember',
          topicArea: 'heart failure pharmacotherapy',
          rationale: 'Tests recall of evidence-based first-line therapy guidelines, a foundational clinical fact.',
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
          bloomsLevel: 'remember',
          topicArea: 'statin mechanism',
          rationale: 'Anchors understanding of cholesterol synthesis inhibition before applying it to clinical scenarios.',
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
          bloomsLevel: 'understand',
          topicArea: 'pharmacokinetics vs pharmacodynamics',
          rationale: 'Establishes the conceptual distinction students need before reasoning about drug behaviour.',
        },
        {
          promptText: 'Define the therapeutic index and explain its clinical significance.',
          promptType: 'short_answer',
          bloomsLevel: 'understand',
          topicArea: 'therapeutic index',
          rationale: 'Connects a core pharmacology metric to its practical meaning for patient safety.',
        },
        {
          promptText: 'What is a drug-drug interaction? Give one clinical example.',
          promptType: 'short_answer',
          bloomsLevel: 'apply',
          topicArea: 'drug-drug interactions',
          rationale: 'Requires students to apply a definition to a concrete case, bridging theory and practice.',
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
        bloomsLevel: 'analyze',
        topicArea: 'receptor antagonism types',
        rationale: 'Requires students to analyze two mechanisms and predict their distinct effects on a graphical representation.',
      },
      {
        promptText: 'A patient is prescribed warfarin and begins taking ibuprofen. What pharmacological interactions would you expect, and what monitoring would you recommend?',
        promptType: 'long_answer',
        bloomsLevel: 'apply',
        topicArea: 'drug-drug interactions — warfarin',
        rationale: 'Applies drug interaction principles to a clinically common and high-stakes scenario.',
      },
      {
        promptText: 'Compare the mechanisms of action of ACE inhibitors and ARBs. In what clinical situations might you prefer one over the other?',
        promptType: 'long_answer',
        bloomsLevel: 'evaluate',
        topicArea: 'RAAS pathway — ACE inhibitors vs ARBs',
        rationale: 'Demands critical evaluation of two related drug classes within the same pathway, requiring both mechanistic and clinical reasoning.',
      },
    ],
    warning: 'Mock mode active (MOCK_AI=true). Set MOCK_AI=false to use real OpenAI generation.',
  };
}
