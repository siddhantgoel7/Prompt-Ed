// Type definitions for the AI pipeline: file uploads, chunk metadata, generated prompts, and MC options.
// @see US 1.16, 1.18, 1.23, 2.08, 2.10

import { PromptType } from './discussion';

export interface AIPromptPreferences {
  difficulty: 'basic' | 'intermediate' | 'advanced';
  style: 'socratic' | 'factual' | 'clinical_scenario';
  length: 'brief' | 'standard' | 'detailed';
  focusAreas?: string;
}

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
  bloomsLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  topicArea?: string;   // e.g., "beta-blocker mechanism"
  rationale?: string;   // why this question is pedagogically valuable
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Result of a generate call
export interface CandidateSet {
  candidates: GeneratedPrompt[];
  // Present when AI had degraded context (e.g. no files, no transcriptText)
  warning?: string;
  tokenUsage?: TokenUsage;
  model?: string;
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

/** Where a chunk's text came from within its source document. */
export type ContentOrigin =
  | 'slide_body'         // PPTX: text extracted from slide body shapes
  | 'slide_notes'        // PPTX: text extracted from speaker notes
  | 'visual_description' // PDF or PPTX: AI-generated description of images/diagrams
  | 'page_text'          // PDF: text layer extracted by pdfjs
  | 'transcript';        // STT: gpt-4o-transcribe output

/** Structural role a chunk plays in the index.
 *  'text' is the only active value; 'page_summary' and 'relationship' are reserved
 *  for future multi-granularity chunking strategies. */
export type ChunkType = 'text' | 'page_summary' | 'relationship';

/** JSONB metadata stored with each lesson_chunk row. */
export interface ChunkMetadata {
  contentOrigin: ContentOrigin;
  chunkType: ChunkType;
  /** Source file name */
  fileName?: string;
  /** 1-based page number (PDF only) */
  pageNumber?: number;
  /** 1-based slide number (PPTX only) */
  slideNumber?: number;
  /** Sequential index of this chunk within the file (0-based) */
  chunkIndex: number;
  /** Transcript-only: position of the segment in the STT output */
  segmentIndex?: number;
  /** Transcript-only: ISO timestamp of when the transcript was recorded */
  recordedAt?: string;
}

/** A single structured content section returned by a parser, before chunking.
 *  Maps to one logical unit of content (one page's text, one slide's notes, etc.)
 *  and carries the provenance metadata needed to populate ChunkMetadata after splitting. */
export interface ParsedSection {
  content: string;
  contentOrigin: ContentOrigin;
  /** Set for PDF sections (1-based) */
  pageNumber?: number;
  /** Set for PPTX sections (1-based) */
  slideNumber?: number;
}
