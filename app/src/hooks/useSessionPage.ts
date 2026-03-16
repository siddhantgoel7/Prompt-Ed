import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import type { Lesson } from '@/types/lesson';
import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { LessonFile, GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

import { useLessonAI } from './useSessionPage/useLessonAI';
import { useLessonDiscussions } from './useSessionPage/useLessonDiscussions';
import { useLessonFiles } from './useSessionPage/useLessonFiles';
import {
  fetchLessonWithInstructorIdApi,
  activateDraftLessonApi,
  endLessonApi,
  reactivateLessonApi,
  fetchTranscriptsApi
} from '@/lib/api/lessonApi';
import {
  fetchEndedDiscussionsApi,
  closeActiveDiscussionsApi,
  fetchExportDiscussionsApi
} from '@/lib/api/discussionsApi';

type DiscussionWithResponses = Discussion & { responses: Response[] };

type TranscriptRow = {
  id: string;
  content: string;
  created_at: string;
  metadata?: { recordedAt?: string };
};

type ExportDiscussionRow = {
  prompt_text: string;
  created_at: string;
  responses?: Array<{ response_text: string; created_at: string; flagged_at?: string | null }>;
};

export type SessionVM = {
  lesson: Lesson;
  loading: boolean;
  notFound: boolean;
  isConnected: boolean;
  // Live count of students currently present in the session via Realtime Presence
  studentCount: number;
  // Highest student count seen during the current active discussion
  peakStudentCount: number;
  handleReconnect: () => void;
  discussions: DiscussionWithResponseCount[];
  activeDiscussion: Discussion | null;
  responses: Response[];
  promptInput: string;
  setPromptInput: React.Dispatch<React.SetStateAction<string>>;
  displayState: boolean;
  handleDisplay: () => void;
  endingLesson: boolean;
  endError: string | null;
  handleEnd: () => Promise<void> | void;
  transcripts: TranscriptRow[];
  transcriptsLoading: boolean;
  transcriptsError: string | null;
  openFile: (fileId: string) => Promise<void>;
  handlePublishDiscussion: (timerSeconds?: number | null) => Promise<void> | void;
  handleCloseDiscussion: (discussionId: string) => Promise<void> | void;
  historyLoading: boolean;
  historyError: string | null;
  lessonDiscussions: DiscussionWithResponses[];
  exportingData: boolean;
  activatingLesson: boolean;
  handleExportLessonData: () => Promise<void> | void;
  handleActivate: () => Promise<void> | void;
  files: LessonFile[];
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
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
  handlePublishAiCandidate: (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled?: boolean, timerSeconds?: number | null) => Promise<void>;
  discussionTimerEndTime: number | null;
  discussionTimerSeconds: number | null;
  removeResponse: (responseId: string) => Promise<void>;
  flaggedResponses: Response[];
  restoreResponse: (responseId: string) => Promise<void>;
};

export function useSessionPage(lessonId: string): SessionVM {
  const router = useRouter();
  // studentCount: live presence count from Realtime — number of students currently in session
  const { channel, isConnected, reconnect, studentCount } = useRealtime(lessonId, 'instructor');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [promptInput, setPromptInput] = useState('');

  // Extract separated domain concerns
  const {
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
    clearAIState
  } = useLessonAI(lessonId, setPromptInput);

  const {
    peakStudentCount,
    discussions,
    activeDiscussion,
    responses,
    discussionTimerEndTime,
    discussionTimerSeconds,
    fetchDiscussions,
    fetchResponses,
    handleCloseDiscussion,
    handlePublishDiscussion,
    handlePublishAiCandidate,
    removeResponse,
    flaggedResponses,
    restoreResponse,
  // studentCount passed so publish handlers can snapshot it into participant_snapshot
  } = useLessonDiscussions(lessonId, channel, clearAIState, promptInput, setPromptInput, promptType, studentCount);

  const {
    files,
    isUploading,
    fetchFiles,
    uploadFile,
    deleteFile,
    openFile
  } = useLessonFiles(lessonId);

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

  const generatePinCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();

  const fetchTranscripts = useCallback(async () => {
    setTranscriptsLoading(true);
    try {
      const { data, error } = await fetchTranscriptsApi(lessonId);

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

  const syncLessonState = useCallback(async () => {
    await fetchDiscussions();
    await fetchFiles();
  }, [fetchDiscussions, fetchFiles]);

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

      const { data: lessonData, error: lessonError } = await fetchLessonWithInstructorIdApi(lessonId);

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
        const { data: updatedLesson } = await activateDraftLessonApi(lessonId, pinCode);
        setLesson((updatedLesson as Lesson) ?? (lessonData as Lesson));
      } else {
        setLesson(lessonData as Lesson);

        if (lessonData.status === 'ended') {
          setHistoryLoading(true);
          const { data: discussionsData, error: discussionsError } = await fetchEndedDiscussionsApi(lessonId);

          if (discussionsError) {
            setHistoryError('Failed to load discussions/responses.');
            setLessonDiscussions([]);
          } else {
            setHistoryError(null);
            // Filter out soft-deleted (flagged) responses
            const filtered = ((discussionsData || []) as DiscussionWithResponses[]).map(d => ({
              ...d,
              responses: (d.responses || []).filter(r => !r.flagged_at),
            }));
            setLessonDiscussions(filtered);
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

  useEffect(() => {
    if (!initializedConnectionRef.current) {
      initializedConnectionRef.current = true;
      wasConnectedRef.current = isConnected;
      return;
    }
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
    } catch { }
  }, [draftKey, setPromptInput, setTranscriptText, setPromptType]);

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
  }, [lesson, syncLessonState]);

  const handleDisplay = useCallback(() => {
    if (!lesson) return;
    setDisplayState((prev) => !prev);
  }, [lesson]);

  const handleEnd = useCallback(async () => {
    if (!lesson) return;
    setEndingLesson(true);
    setEndError(null);
    const now = new Date().toISOString();

    // If a discussion is still active, close it properly so peak gets saved to DB
    if (activeDiscussion) {
      await handleCloseDiscussion(activeDiscussion.id);
    }

    await closeActiveDiscussionsApi(lesson.id, now);
    const { error } = await endLessonApi(lesson.id, now);

    if (error) { setEndError('Failed to end lesson. Please try again.'); setEndingLesson(false); return; }

    if (channel) {
      await (channel as { send: (msg: unknown) => Promise<unknown> }).send({
        type: 'broadcast',
        event: 'lesson:ended',
        payload: { lessonId: lesson.id, endedAt: now, message: 'Lesson has ended' },
      });
    }
    router.push(`/lessons_page/${lesson.course_id}`);
  }, [lesson, channel, router, activeDiscussion, handleCloseDiscussion]);

  const handleActivate = useCallback(async () => {
    if (!lesson) return;
    setActivatingLesson(true);
    const { error } = await reactivateLessonApi(lesson.id);

    if (error) { setEndError('Failed to activate lesson.'); setActivatingLesson(false); return; }
    setLesson((prev) => prev ? { ...prev, status: 'active', started_at: new Date().toISOString(), ended_at: null } : prev);
    setActivatingLesson(false);
  }, [lesson]);

  const handleExportLessonData = useCallback(async () => {
    if (!lesson) return;
    setExportingData(true);
    try {
      const { data, error } = await fetchExportDiscussionsApi(lesson.id);

      if (error) { setEndError('Failed to export lesson data.'); return; }

      const rows = (data ?? []) as unknown as ExportDiscussionRow[];
      const lines: string[] = [lesson.title, `Exported: ${new Date().toLocaleString()}`, '', 'DISCUSSIONS AND RESPONSES', '-------------------------'];

      rows.forEach((d, i) => {
        lines.push('', `Discussion ${i + 1}`, `Prompt: ${d.prompt_text}`, `Time: ${new Date(d.created_at).toLocaleString()}`, 'Responses:');
        const res = (d.responses ?? []).filter(r => !r.flagged_at);
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
    loading, notFound, isConnected, studentCount, peakStudentCount, handleReconnect,
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
    discussionTimerEndTime, discussionTimerSeconds,
    removeResponse,
    flaggedResponses,
    restoreResponse,
  }), [
    lesson, loading, notFound, isConnected, studentCount, peakStudentCount, handleReconnect,
    discussions, activeDiscussion, responses, promptInput,
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
    discussionTimerEndTime, discussionTimerSeconds,
    removeResponse,
    flaggedResponses,
    restoreResponse,
  ]);
}