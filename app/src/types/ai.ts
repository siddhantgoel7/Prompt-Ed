// Type definitions for the AI pipeline: file uploads, chunk metadata, generated prompts, and MC options.
// @see US 1.16, 1.18, 1.23, 2.08, 2.10

import { PromptType } from './discussion';

// Upload pipeline state for a lesson file
export type UploadStatus = 'uploading' | 'processing' | 'ready' | 'failed';

// Multiple choice option. is_correct is ONLY present server-side.
// It must never appear in any API response sent to the student client.
export interface MCOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  is_correct?: boolean; // server-side only — stripped before any student response
}

// Student-safe MC option (is_correct field excluded at type level)
export type MCOptionSafe = Omit<MCOption, 'is_correct'>;

// A single AI-generated discussion prompt candidate
export interface GeneratedPrompt {
  promptText: string;
  promptType: PromptType;
  mcOptions?: MCOption[]; // only present when promptType === 'multiple_choice'
}

// Result of a generate call
export interface CandidateSet {
  candidates: GeneratedPrompt[];
  // Present when AI had degraded context (e.g. no files, no transcriptText)
  warning?: string;
}

// Metadata stored with each lesson file
export interface LessonFile {
  id: string;
  lessonId: string;
  fileName: string;
  fileType: 'pdf' | 'pptx';
  fileSizeBytes: number;
  status: UploadStatus;
  uploadedAt: string;
}

// Chunk metadata JSONB shape — used to enable future RAG weighting
// @see docs/sprint3-ai-pipeline-proposal.md "Future RAG Weighting Design"
export type ChunkSource = 'slide_body' | 'slide_notes' | 'transcript' | 'prior_transcript';

export interface ChunkMetadata {
  source: ChunkSource;
  slideNumber?: number;
  fileName?: string;
  segmentIndex?: number;
  recordedAt?: string;
}
