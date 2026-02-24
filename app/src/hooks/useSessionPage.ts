// src/hooks/useSessionPage.ts
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import type { Lesson } from '@/types/lesson';
import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { LessonFile, GeneratedPrompt, CandidateSet } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

type DiscussionWithResponses = Discussion & { responses: Response[] };

// Minimal channel shape we need (no `any`)
type RealtimeLikeChannel = {
  on: (
    type: 'broadcast',
    filter: { event: string },
    callback: (payload: unknown) => void
  ) => { unsubscribe: () => void };
};

type DiscussionCountRow = Discussion & {
  responses?: Array<{ count: number }>;
};

type ExportDiscussionRow = {
  prompt_text: string;
  created_at: string;
  responses?: Array<{ response_text: string; created_at: string }>;
};

// Supabase broadcast payloads are sometimes wrapped (payload.payload)
type BroadcastEnvelope<T> = { payload?: T } & Partial<T>;
function unwrapBroadcast<T>(raw: unknown): T | undefined {
  const env = raw as BroadcastEnvelope<T> | undefined;
  if (!env) return undefined;
  return (env.payload as T) ?? (env as unknown as T);
}

export type SessionVM = {
  // core
  lesson: Lesson; // guaranteed for views
  loading: boolean;
  notFound: boolean;

  // realtime
  isConnected: boolean;

  // discussions
  discussions: DiscussionWithResponseCount[];
  activeDiscussion: Discussion | null;
  responses: Response[];
  promptInput: string;
  setPromptInput: React.Dispatch<React.SetStateAction<string>>;

  // active lesson UI/actions
  displayState: boolean;
  handleDisplay: () => void;

  endingLesson: boolean;
  endError: string | null;
  handleEnd: () => Promise<void> | void;

  handlePublishDiscussion: () => Promise<void> | void;
  handleCloseDiscussion: (discussionId: string) => Promise<void> | void;

  // ended lesson view
  historyLoading: boolean;
  historyError: string | null;
  lessonDiscussions: DiscussionWithResponses[];
  exportingData: boolean;
  activatingLesson: boolean;

  handleExportLessonData: () => Promise<void> | void;
  handleActivate: () => Promise<void> | void;

  // US 1.16 — file state for AI context management
  files: LessonFile[];
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;

  // US 1.18, 1.19 — AI generation state
  transcriptText: string;
  setTranscriptText: React.Dispatch<React.SetStateAction<string>>;
  promptType: PromptType;
  setPromptType: React.Dispatch<React.SetStateAction<PromptType>>;
  candidates: GeneratedPrompt[];
  isGenerating: boolean;
  generationWarning: string | null;
  generateCandidates: () => Promise<void>;
  selectCandidate: (p: GeneratedPrompt) => void;
  regenerateCandidates: () => Promise<void>;
};

export function useSessionPage(lessonId: string): SessionVM {
  const router = useRouter();
  const { channel, isConnected } = useRealtime(lessonId, 'instructor');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // join-code overlay (Display button)
  const [displayState, setDisplayState] = useState(false);

  // end/activate/export UI state
  const [endError, setEndError] = useState<string | null>(null);
  const [endingLesson, setEndingLesson] = useState(false);
  const [activatingLesson, setActivatingLesson] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  // ended lesson history state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [lessonDiscussions, setLessonDiscussions] = useState<DiscussionWithResponses[]>([]);

  // discussion system
  const [discussions, setDiscussions] = useState<DiscussionWithResponseCount[]>([]);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [publishing, setPublishing] = useState(false);

  // US 1.16 — file state for AI context management
  const [files, setFiles] = useState<LessonFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // US 1.18, 1.19 — AI generation state
  const [transcriptText, setTranscriptText] = useState('');
  const [promptType, setPromptType] = useState<PromptType>('long_answer');
  const [candidates, setCandidates] = useState<GeneratedPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);

  // Generate 6-digit PIN code (same behavior as original)
  const generatePinCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const fetchDiscussions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('discussions')
      .select('*, responses:responses(count)')
      .eq('lesson_id', lessonId)
      .order('display_order', { ascending: true });

    if (!data) return;

    const rows = data as unknown as DiscussionCountRow[];

    const discussionsWithCounts: DiscussionWithResponseCount[] = rows.map((d) => ({
      ...(d as Discussion),
      response_count: d.responses?.[0]?.count ?? 0,
    }));

    setDiscussions(discussionsWithCounts);

    const active = discussionsWithCounts.find((d) => d.status === 'active');
    setActiveDiscussion(active || null);
  }, [lessonId]);

  const fetchFiles = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}/files`);
    if (!res.ok) return;
    const data = await res.json() as LessonFile[];
    setFiles(data);
  }, [lessonId]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: LessonFile = {
      id: tempId,
      lessonId,
      fileName: file.name,
      fileType: file.name.endsWith('.pdf') ? 'pdf' : 'pptx',
      fileSizeBytes: file.size,
      status: 'uploading',
      uploadedAt: new Date().toISOString(),
    };
    setFiles((prev) => [optimistic, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/lessons/${lessonId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }
    } finally {
      setIsUploading(false);
      setFiles((prev) => prev.filter((f) => f.id !== tempId));
      await fetchFiles();
    }
  }, [lessonId, fetchFiles]);

  const deleteFile = useCallback(async (fileId: string) => {
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await fetchFiles();
    }
  }, [lessonId, fetchFiles]);

  // US 1.18, 1.19 — AI generation handlers
  const generateCandidates = useCallback(async () => {
    setIsGenerating(true);
    setGenerationWarning(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, transcriptText }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Generation failed');
      }
      const data = await res.json() as CandidateSet;
      setCandidates(data.candidates);
      setGenerationWarning(data.warning ?? null);
    } catch (err) {
      setGenerationWarning(err instanceof Error ? err.message : 'Failed to generate prompts');
    } finally {
      setIsGenerating(false);
    }
  }, [lessonId, promptType, transcriptText]);

  const selectCandidate = useCallback((p: GeneratedPrompt) => {
    setPromptInput(p.promptText);
    setPromptType(p.promptType);
  }, []);

  const regenerateCandidates = useCallback(async () => {
    setCandidates([]);
    await generateCandidates();
  }, [generateCandidates]);

  // initial lesson load (same behavior as original)
  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setNotFound(true);
        setLoading(false);
        router.push('/');
        return;
      }

      // Fetch lesson details with course ownership check
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*, courses!inner(instructor_id)')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData) {
        setNotFound(true);
        setLoading(false);
        router.push('/');
        return;
      }

      // Check if user owns this lesson's course
      if (lessonData.courses.instructor_id !== user.id) {
        setNotFound(true);
        setLoading(false);
        router.push('/');
        return;
      }

      // Start lesson if draft (same behavior as original)
      if (lessonData.status === 'draft') {
        const pinCode = generatePinCode();
        const { data: updatedLesson } = await supabase
          .from('lessons')
          .update({
            status: 'active',
            pin_code: pinCode,
            started_at: new Date().toISOString(),
          })
          .eq('id', lessonId)
          .select()
          .single();

        setLesson((updatedLesson as Lesson) ?? (lessonData as Lesson));
      } else {
        setLesson(lessonData as Lesson);

        // If lesson ended, fetch discussion/response history (same query/behavior)
        if (lessonData.status === 'ended') {
          setHistoryLoading(true);

          const { data: discussionsData, error: discussionsError } = await supabase
            .from('discussions')
            .select(`
              id, lesson_id, prompt_text, prompt_type, status, created_at, published_at, closed_at, display_order,
              responses ( id, discussion_id, response_text, created_at )
            `)
            .eq('lesson_id', lessonId)
            .order('display_order', { ascending: true });

          if (discussionsError) {
            setHistoryError('Failed to load discussions/responses.');
            setLessonDiscussions([]);
          } else {
            setHistoryError(null);
            setLessonDiscussions((discussionsData || []) as DiscussionWithResponses[]);
          }

          setHistoryLoading(false);
        }
      }

      // Fetch existing discussions and files
      await fetchDiscussions();
      await fetchFiles();

      setLoading(false);
    };

    run();
  }, [lessonId, router, fetchDiscussions, fetchFiles]);

  // realtime response submissions (same behavior as original)
  useEffect(() => {
    if (!channel) return;

    const ch = channel as unknown as RealtimeLikeChannel;

    const sub = ch.on('broadcast', { event: 'response:new' }, (raw) => {
      const data = unwrapBroadcast<{ response: Response }>(raw);
      const response = data?.response;
      if (!response) return;

      setResponses((prev) => [response, ...prev]);

      // Increment response count for the response's discussion_id (no new discussion creation here)
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === response.discussion_id
            ? { ...d, response_count: (d.response_count ?? 0) + 1 }
            : d
        )
      );
    });

    return () => sub.unsubscribe();
  }, [channel]);

  const handleDisplay = useCallback(() => {
    if (!lesson) return;
    setDisplayState((prev) => !prev);
  }, [lesson]);

  // close discussion by id (this matches how your ActiveCenter calls it)
  const handleCloseDiscussion = useCallback(
    async (discussionId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('discussions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', discussionId);

      if (error) return;

      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'discussion:closed',
          payload: { discussionId },
        });
      }

      setActiveDiscussion(null);
      await fetchDiscussions();
    },
    [channel, fetchDiscussions]
  );

  // publish new discussion (same behavior as original)
  const handlePublishDiscussion = useCallback(async () => {
    if (!promptInput.trim() || publishing) return;

    setPublishing(true);

    const supabase = createClient();

    // Close existing active discussion first (same behavior)
    if (activeDiscussion) {
      await handleCloseDiscussion(activeDiscussion.id);
    }

    const displayOrder = discussions.length;

    const { data: newDiscussion, error } = await supabase
      .from('discussions')
      .insert([
        {
          lesson_id: lessonId,
          prompt_text: promptInput,
          prompt_type: 'short_answer',
          status: 'active',
          published_at: new Date().toISOString(),
          display_order: displayOrder,
        },
      ])
      .select()
      .single();

    if (error || !newDiscussion) {
      setPublishing(false);
      return;
    }

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'discussion:published',
        payload: { discussion: newDiscussion as Discussion },
      });
    }

    const withCount: DiscussionWithResponseCount = {
      ...(newDiscussion as Discussion),
      response_count: 0,
    };

    setActiveDiscussion(newDiscussion as Discussion);
    setDiscussions((prev) => [...prev, withCount]);
    setResponses([]);
    setPromptInput('');
    setPublishing(false);
  }, [promptInput, publishing, activeDiscussion, discussions.length, lessonId, channel, handleCloseDiscussion]);

  // end lesson (same behavior as original)
  const handleEnd = useCallback(async () => {
    if (!lesson) return;

    setEndingLesson(true);
    setEndError(null);

    const supabase = createClient();
    const now = new Date().toISOString();

    // Close all active discussions before ending the lesson (US 1.09/1.10)
    await supabase
      .from('discussions')
      .update({ status: 'closed', closed_at: now })
      .eq('lesson_id', lesson.id)
      .eq('status', 'active');

    const { error } = await supabase
      .from('lessons')
      .update({
        status: 'ended',
        ended_at: now,
      })
      .eq('id', lesson.id);

    if (error) {
      setEndError('Failed to end lesson. Please try again.');
      setEndingLesson(false);
      return;
    }

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'lesson:ended',
        payload: {
          lessonId: lesson.id,
          endedAt: new Date().toISOString(),
          message: 'Lesson has ended',
        },
      });
    }

    router.push(`/lessons_page/${lesson.course_id}`);
  }, [lesson, channel, router]);

  // activate lesson from ended screen (same behavior as original)
  const handleActivate = useCallback(async () => {
    if (!lesson) return;

    setActivatingLesson(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('lessons')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
      })
      .eq('id', lesson.id);

    if (error) {
      setEndError('Failed to activate lesson. Please try again.');
      setActivatingLesson(false);
      return;
    }

    setLesson((prev) =>
      prev
        ? {
            ...prev,
            status: 'active',
            started_at: new Date().toISOString(),
            ended_at: null,
          }
        : prev
    );

    setActivatingLesson(false);
  }, [lesson]);

  // export txt (same behavior as original)
  const handleExportLessonData = useCallback(async () => {
    if (!lesson) return;

    setExportingData(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('discussions')
        .select(
          `
          prompt_text,
          created_at,
          responses ( response_text, created_at )
        `
        )
        .eq('lesson_id', lesson.id)
        .order('display_order', { ascending: true });

      if (error) {
        setEndError('Failed to export lesson data.');
        return;
      }

      const rows = (data ?? []) as unknown as ExportDiscussionRow[];

      const lines: string[] = [];
      lines.push(lesson.title);
      lines.push(`Exported: ${new Date().toLocaleString()}`);
      lines.push('');

      lines.push('DISCUSSIONS AND RESPONSES');
      lines.push('-------------------------');

      rows.forEach((d, index) => {
        lines.push('');
        lines.push(`Discussion ${index + 1}`);
        lines.push(`Prompt: ${d.prompt_text}`);
        lines.push(`Time: ${new Date(d.created_at).toLocaleString()}`);
        lines.push('Responses:');

        const res = d.responses ?? [];
        if (res.length === 0) {
          lines.push('  - No responses');
        } else {
          res.forEach((r, rIndex) => {
            lines.push(`  ${rIndex + 1}. ${r.response_text}`);
            lines.push(`     ${new Date(r.created_at).toLocaleString()}`);
          });
        }
      });

      lines.push('');
      lines.push('TRANSCRIPT');
      lines.push('----------');
      lines.push('No transcripts used.');

      lines.push('');
      lines.push('LECTURE MATERIAL');
      lines.push('----------------');
      lines.push('No lecture material uploaded.');

      const textContent = lines.join('\n');
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = lesson.title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
      a.href = url;
      a.download = `${safeTitle || 'lesson'}_export.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingData(false);
    }
  }, [lesson]);

  // Return the exact VM your views expect
  return useMemo(
    () => ({
      // core
      lesson: lesson as Lesson, // safe because SessionPage gates by loading/notFound
      loading,
      notFound,

      // realtime
      isConnected,

      // discussion system
      discussions,
      activeDiscussion,
      responses,
      promptInput,
      setPromptInput,

      // overlay
      displayState,
      handleDisplay,

      // end lesson
      endingLesson,
      endError,
      handleEnd,

      // discussion actions
      handlePublishDiscussion,
      handleCloseDiscussion,

      // ended view
      historyLoading,
      historyError,
      lessonDiscussions,
      exportingData,
      activatingLesson,
      handleExportLessonData,
      handleActivate,

      // US 1.16 — file management
      files,
      isUploading,
      uploadFile,
      deleteFile,

      // US 1.18, 1.19 — AI generation
      transcriptText,
      setTranscriptText,
      promptType,
      setPromptType,
      candidates,
      isGenerating,
      generationWarning,
      generateCandidates,
      selectCandidate,
      regenerateCandidates,
    }),
    [
      lesson,
      loading,
      notFound,
      isConnected,
      discussions,
      activeDiscussion,
      responses,
      promptInput,
      displayState,
      handleDisplay,
      endingLesson,
      endError,
      handleEnd,
      handlePublishDiscussion,
      handleCloseDiscussion,
      historyLoading,
      historyError,
      lessonDiscussions,
      exportingData,
      activatingLesson,
      handleExportLessonData,
      handleActivate,
      files,
      isUploading,
      uploadFile,
      deleteFile,
      transcriptText,
      promptType,
      candidates,
      isGenerating,
      generationWarning,
      generateCandidates,
      selectCandidate,
      regenerateCandidates,
    ]
  );
}
