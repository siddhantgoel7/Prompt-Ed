// src/hooks/useSessionPage.ts
// MERGED: teammate's base + our STT (handlePublishAiCandidate, transcript state)
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

type RealtimeLikeChannel = {
  on: (
    type: 'broadcast',
    filter: { event: string },
    callback: (payload: unknown) => void
  ) => { unsubscribe: () => void };
  send: (message: unknown) => Promise<unknown>;
};

type DiscussionCountRow = Discussion & {
  responses?: Array<{ count: number }>;
};

type ExportDiscussionRow = {
  prompt_text: string;
  created_at: string;
  responses?: Array<{ response_text: string; created_at: string }>;
};
type TranscriptRow = {
  id: string;
  content: string;
  created_at: string;
  metadata?: { recordedAt?: string };
};


type BroadcastEnvelope<T> = { payload?: T } & Partial<T>;
function unwrapBroadcast<T>(raw: unknown): T | undefined {
  const env = raw as BroadcastEnvelope<T> | undefined;
  if (!env) return undefined;
  return (env.payload as T) ?? (env as unknown as T);
}

export type SessionVM = {
  // core
  lesson: Lesson;
  loading: boolean;
  notFound: boolean;

  // realtime
  isConnected: boolean;
  handleReconnect: () => void;

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

  transcripts: TranscriptRow[];
  transcriptsLoading: boolean;
  transcriptsError: string | null;

  openFile: (fileId: string) => Promise<void>;


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

  // US 1.16 — file state
  files: LessonFile[];
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;

  // US 1.18, 1.19 — AI generation
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

  // US 1.17 — STT: publish AI candidate directly as a discussion
  handlePublishAiCandidate: (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled?: boolean) => Promise<void>;
};

export function useSessionPage(lessonId: string): SessionVM {
  const router = useRouter();
  const { channel, isConnected, reconnect } = useRealtime(lessonId, 'instructor');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [transcriptsLoading, setTranscriptsLoading] = useState(false);
  const [transcriptsError, setTranscriptsError] = useState<string | null>(null);

  const syncIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedConnectionRef = React.useRef(false);
  const wasConnectedRef = React.useRef(false);


  const [displayState, setDisplayState] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [endingLesson, setEndingLesson] = useState(false);
  const [activatingLesson, setActivatingLesson] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [lessonDiscussions, setLessonDiscussions] = useState<DiscussionWithResponses[]>([]);

  const [discussions, setDiscussions] = useState<DiscussionWithResponseCount[]>([]);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [publishing, setPublishing] = useState(false);

  // US 1.16 — file state
  const [files, setFiles] = useState<LessonFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // US 1.18, 1.19 — AI generation state
  const [transcriptText, setTranscriptText] = useState('');
  const [promptType, setPromptType] = useState<PromptType>('long_answer');
  const [candidates, setCandidates] = useState<GeneratedPrompt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);

  const generatePinCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

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
    await fetchResponsesForDiscussion(active?.id ?? null);
  }, [lessonId]);

  const fetchResponsesForDiscussion = useCallback(async (discussionId: string | null) => {
    if (!discussionId) {
      setResponses([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: false });

    setResponses((data ?? []) as Response[]);
  }, []);

  


  const fetchFiles = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}/files`);
    if (!res.ok) return;
    const data = await res.json() as LessonFile[];
    setFiles(data);
  }, [lessonId]);

  const syncLessonState = useCallback(async () => {
    await fetchDiscussions();
    await fetchFiles();
  }, [fetchDiscussions, fetchFiles]);

  const fetchTranscripts = useCallback(async () => {
    setTranscriptsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('lesson_chunks')
        .select('id, content, created_at, metadata')
        .eq('lesson_id', lessonId)
        .eq('content_type', 'transcript')
        .order('created_at', { ascending: true });

      if (error) {
        setTranscriptsError('Failed to load transcripts.');
        setTranscripts([]);
      } else {
        setTranscriptsError(null);
        setTranscripts((data ?? []) as TranscriptRow[]);
      }
    } catch {
      setTranscriptsError('Failed to load transcripts.');
      setTranscripts([]);
    } finally {
      setTranscriptsLoading(false);
    }
  }, [lessonId]);


  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: LessonFile = {
      id: tempId,
      lessonId,
      fileName: file.name,
      fileType: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx',
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
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`, { method: 'DELETE' });
    if (res.ok) await fetchFiles();
  }, [lessonId, fetchFiles]);

  const openFile = useCallback(async (fileId: string) => {
    const res = await fetch(`/api/lessons/${lessonId}/files/${fileId}`);
    if (!res.ok) return;

    const { url, fileName } = await res.json() as { url: string; fileName: string };

    // download with clean filename
    const fileRes = await fetch(url);
    const blob = await fileRes.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName; // this is the clean original name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, [lessonId]);

  


  // Poll for processing files
  useEffect(() => {
    const hasProcessing = files.some(f => f.status === 'processing');
    if (!hasProcessing) return;

    const intervalId = setInterval(() => {
      fetchFiles();
    }, 2000);

    return () => clearInterval(intervalId);
  }, [files, fetchFiles]);


  // US 1.18, 1.19 — AI generation
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

  const handleCloseDiscussion = useCallback(async (discussionId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('discussions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', discussionId);

    if (error) return;

    if (channel) {
      await (channel as unknown as RealtimeLikeChannel).send({
        type: 'broadcast',
        event: 'discussion:closed',
        payload: { discussionId },
      });
    }
    setActiveDiscussion(null);
    await fetchDiscussions();
  }, [channel, fetchDiscussions]);

  // US 1.17 — Publish AI candidate directly (skips text input, closes previous discussion)
  // SECURITY: is_correct is stripped before broadcasting to students
  const handlePublishAiCandidate = useCallback(async (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled: boolean = false) => {
    if (publishing) return;
    setPublishing(true);

    const supabase = createClient();

    if (activeDiscussion) {
      await handleCloseDiscussion(activeDiscussion.id);
    }

    // Determine the AI suggested correct option
    let aiSuggestedCorrectOption = null;
    if (candidate.mcOptions) {
      const correctOpt = candidate.mcOptions.find(o => o.is_correct);
      if (correctOpt) {
        aiSuggestedCorrectOption = correctOpt.label;
      }
    }

    const finalCorrectOption = overrideCorrectOption || aiSuggestedCorrectOption;

    // Update mcOptions if overrideCorrectOption is provided to ensure is_correct matches
    const finalMcOptions = candidate.mcOptions ? candidate.mcOptions.map(opt => ({
      ...opt,
      is_correct: opt.label === finalCorrectOption
    })) : null;

    const { data: newDiscussion, error } = await supabase
      .from('discussions')
      .insert([{
        lesson_id: lessonId,
        prompt_text: candidate.promptText,
        prompt_type: candidate.promptType,
        status: 'active',
        published_at: new Date().toISOString(),
        display_order: discussions.length,
        source: 'ai_generated',
        // Store full mc_options with is_correct server-side
        mc_options: finalMcOptions,
        correct_option: finalCorrectOption,
        feedback_enabled: feedbackEnabled,
        ai_generated_correct_option: aiSuggestedCorrectOption,
      }])
      .select()
      .single();

    if (error || !newDiscussion) {
      console.error('Failed to insert discussion into Supabase:', error);
      setPublishing(false);
      return;
    }

    if (channel) {
      // SECURITY C3: strip is_correct before broadcasting to students
      const studentSafe = {
        ...newDiscussion,
        mc_options: candidate.mcOptions
          ? candidate.mcOptions.map(({ label, text }: { label: string; text: string }) => ({ label, text }))
          : null,
      };
      await (channel as unknown as RealtimeLikeChannel).send({
        type: 'broadcast',
        event: 'discussion:published',
        payload: { discussion: studentSafe },
      });
    }

    setActiveDiscussion(newDiscussion as Discussion);
    setDiscussions((prev) => [...prev, { ...(newDiscussion as Discussion), response_count: 0 }]);
    setResponses([]);
    setPromptInput('');
    setCandidates([]);
    setTranscriptText('');
    setPublishing(false);
  }, [publishing, activeDiscussion, discussions.length, lessonId, channel, handleCloseDiscussion]);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setNotFound(true);
        setLoading(false);
        router.push('/');
        return;
      }

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

      if (lessonData.courses.instructor_id !== user.id) {
        setNotFound(true);
        setLoading(false);
        router.push('/');
        return;
      }

      if (lessonData.status === 'draft') {
        const pinCode = generatePinCode();
        const { data: updatedLesson } = await supabase
          .from('lessons')
          .update({ status: 'active', pin_code: pinCode, started_at: new Date().toISOString() })
          .eq('id', lessonId)
          .select()
          .single();
        setLesson((updatedLesson as Lesson) ?? (lessonData as Lesson));
      } else {
        setLesson(lessonData as Lesson);

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
          await fetchTranscripts();

        }
      }

      await fetchDiscussions();
      await fetchFiles();
      setLoading(false);
    };

    run();
  }, [lessonId, router, fetchDiscussions, fetchFiles, fetchTranscripts]);

  const fetchResponses = useCallback(async () => {
    if (!activeDiscussion) {
      setResponses([]);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', activeDiscussion.id)
      .order('created_at', { ascending: false });

    if (data) setResponses(data as Response[]);
  }, [activeDiscussion]);

  // Fetch existing responses when the active discussion changes
  useEffect(() => {
    fetchResponses();
     
  }, [activeDiscussion?.id, fetchResponses]);

  // Realtime: incoming student responses
  useEffect(() => {
    if (!channel) return;
    const ch = channel as unknown as RealtimeLikeChannel;
    const sub = ch.on('broadcast', { event: 'response:new' }, (raw) => {
      const data = unwrapBroadcast<{ response: Response }>(raw);
      const response = data?.response;
      if (!response) return;
      setResponses((prev) => {
        if (prev.some((r) => r.id === response.id)) return prev;
        return [response, ...prev];
      });
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

  

  useEffect(() => {
  // skip first render/connect
    if (!initializedConnectionRef.current) {
      initializedConnectionRef.current = true;
      wasConnectedRef.current = isConnected;
      return;
    }

    // only true reconnect: false -> true
    if (isConnected && !wasConnectedRef.current) {
      void syncLessonState();
    }

    wasConnectedRef.current = isConnected;
  }, [isConnected, syncLessonState]);

  const draftKey = `lesson:${lessonId}:instructor-draft`;

  useEffect(() => {
    if (!lesson || lesson.status !== 'active') return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ promptInput, transcriptText, promptType, savedAt: new Date().toISOString() })
    );
  }, [draftKey, lesson, promptInput, transcriptText, promptType]);

  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const d = JSON.parse(raw) as { promptInput?: string; transcriptText?: string; promptType?: PromptType };
      if (d.promptInput) setPromptInput(d.promptInput);
      if (d.transcriptText) setTranscriptText(d.transcriptText);
      if (d.promptType) setPromptType(d.promptType);
    } catch {}
  }, [draftKey]);

  useEffect(() => {
    if (!lesson || lesson.status !== 'active') return;

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = setInterval(() => {
      void syncLessonState();
    }, 30000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [lesson?.id, lesson?.status, syncLessonState]);




  const handleDisplay = useCallback(() => {
    if (!lesson) return;
    setDisplayState((prev) => !prev);
  }, [lesson]);

  const handlePublishDiscussion = useCallback(async () => {
    if (!promptInput.trim() || publishing) return;
    setPublishing(true);

    const supabase = createClient();
    if (activeDiscussion) await handleCloseDiscussion(activeDiscussion.id);

    const { data: newDiscussion, error } = await supabase
      .from('discussions')
      .insert([{
        lesson_id: lessonId,
        prompt_text: promptInput,
        prompt_type: promptType,
        status: 'active',
        published_at: new Date().toISOString(),
        display_order: discussions.length,
        source: 'manual',
      }])
      .select()
      .single();

    if (error || !newDiscussion) { setPublishing(false); return; }

    if (channel) {
      await (channel as unknown as RealtimeLikeChannel).send({
        type: 'broadcast',
        event: 'discussion:published',
        payload: { discussion: newDiscussion as Discussion },
      });
    }

    setActiveDiscussion(newDiscussion as Discussion);
    setDiscussions((prev) => [...prev, { ...(newDiscussion as Discussion), response_count: 0 }]);
    setResponses([]);
    setPromptInput('');
    setPublishing(false);
  }, [promptInput, publishing, promptType, activeDiscussion, discussions.length, lessonId, channel, handleCloseDiscussion]);

  const handleEnd = useCallback(async () => {
    if (!lesson) return;
    setEndingLesson(true);
    setEndError(null);
    const supabase = createClient();
    const now = new Date().toISOString();

    await supabase.from('discussions')
      .update({ status: 'closed', closed_at: now })
      .eq('lesson_id', lesson.id).eq('status', 'active');

    const { error } = await supabase.from('lessons')
      .update({ status: 'ended', ended_at: now }).eq('id', lesson.id);

    if (error) { setEndError('Failed to end lesson. Please try again.'); setEndingLesson(false); return; }

    if (channel) {
      await (channel as unknown as RealtimeLikeChannel).send({
        type: 'broadcast',
        event: 'lesson:ended',
        payload: { lessonId: lesson.id, endedAt: now, message: 'Lesson has ended' },
      });
    }
    router.push(`/lessons_page/${lesson.course_id}`);
  }, [lesson, channel, router]);

  const handleActivate = useCallback(async () => {
    if (!lesson) return;
    setActivatingLesson(true);
    const supabase = createClient();
    const { error } = await supabase.from('lessons')
      .update({ status: 'active', started_at: new Date().toISOString(), ended_at: null })
      .eq('id', lesson.id);

    if (error) { setEndError('Failed to activate lesson.'); setActivatingLesson(false); return; }
    setLesson((prev) => prev ? { ...prev, status: 'active', started_at: new Date().toISOString(), ended_at: null } : prev);
    setActivatingLesson(false);
  }, [lesson]);

  const handleExportLessonData = useCallback(async () => {
    if (!lesson) return;
    setExportingData(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('discussions')
        .select('prompt_text, created_at, responses ( response_text, created_at )')
        .eq('lesson_id', lesson.id)
        .order('display_order', { ascending: true });

      if (error) { setEndError('Failed to export lesson data.'); return; }

      const rows = (data ?? []) as unknown as ExportDiscussionRow[];
      const lines: string[] = [lesson.title, `Exported: ${new Date().toLocaleString()}`, '', 'DISCUSSIONS AND RESPONSES', '-------------------------'];

      rows.forEach((d, i) => {
        lines.push('', `Discussion ${i + 1}`, `Prompt: ${d.prompt_text}`, `Time: ${new Date(d.created_at).toLocaleString()}`, 'Responses:');
        const res = d.responses ?? [];
        if (res.length === 0) { lines.push('  - No responses'); }
        else { res.forEach((r, ri) => { lines.push(`  ${ri + 1}. ${r.response_text}`, `     ${new Date(r.created_at).toLocaleString()}`); }); }
      });
      lines.push('', 'TRANSCRIPTS', '-----------');
      if (transcripts.length === 0) {
        lines.push('No transcripts used.');
      } else {
        transcripts.forEach((t, i) => {
          const when = new Date(t.metadata?.recordedAt ?? t.created_at).toLocaleString();
          lines.push(
            `Segment ${i + 1} (${when})`,
            t.content,
            ''
          );
        });
      }

      lines.push('', 'LECTURE MATERIAL', '----------------');
      if (files.length === 0) { lines.push('No lecture material uploaded.'); }
      else { files.forEach((f) => lines.push(`- ${f.fileName}`)); }

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lesson.title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase() || 'lesson'}_export.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportingData(false);
    }
  }, [lesson, files, transcripts]);

  const handleReconnect = useCallback(async () => {
    reconnect();
    await fetchDiscussions();
    await fetchResponses();
    await fetchFiles();
  }, [reconnect, fetchDiscussions, fetchResponses, fetchFiles]);

  return useMemo(() => ({
    lesson: lesson as Lesson,
    loading, notFound, isConnected, handleReconnect,
    discussions, activeDiscussion, responses, promptInput, setPromptInput,
    displayState, handleDisplay,
    endingLesson, endError, handleEnd,
    handlePublishDiscussion, handleCloseDiscussion,
    historyLoading, historyError, lessonDiscussions,
    transcripts, transcriptsLoading, transcriptsError,
    exportingData, activatingLesson, handleExportLessonData, handleActivate,
    files, isUploading, uploadFile, deleteFile, openFile,
    transcriptText, setTranscriptText, promptType, setPromptType,
    candidates, isGenerating, generationWarning,
    generateCandidates, selectCandidate, regenerateCandidates,
    handlePublishAiCandidate,
  }), [
    lesson, loading, notFound, isConnected, handleReconnect,
    discussions, activeDiscussion, responses, promptInput,
    displayState, handleDisplay,
    endingLesson, endError, handleEnd,
    handlePublishDiscussion, handleCloseDiscussion,
    historyLoading, historyError, lessonDiscussions,
    transcripts, transcriptsLoading, transcriptsError,
    exportingData, activatingLesson, handleExportLessonData, handleActivate,
    files, isUploading, uploadFile, deleteFile, openFile,
    transcriptText, promptType, candidates, isGenerating, generationWarning,
    generateCandidates, selectCandidate, regenerateCandidates,
    handlePublishAiCandidate,
  ]);
}