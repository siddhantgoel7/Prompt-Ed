import { useState, useCallback, useEffect, useRef } from 'react';
import type { Discussion, DiscussionWithResponseCount, PromptType } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { GeneratedPrompt } from '@/types/ai';

import {
    fetchDiscussionsApi,
    insertDiscussionApi,
    closeDiscussionApi,
    fetchResponsesApi,
    fetchFlaggedResponsesApi,
    updateParticipantSnapshotApi,
    updateDiscussionTimerApi,
    flagResponseApi,
    unflagResponseApi,
} from '@/lib/api/discussionsApi';

interface RealtimeLikeChannel {
    send: (message: unknown) => Promise<unknown>;
    on: (
        type: 'broadcast',
        filter: { event: string },
        callback: (payload: unknown) => void
    ) => { unsubscribe: () => void };
}

type BroadcastEnvelope<T> = { payload?: T } & Partial<T>;
function unwrapBroadcast<T>(raw: unknown): T | undefined {
    const env = raw as BroadcastEnvelope<T> | undefined;
    if (!env) return undefined;
    return (env.payload as T) ?? (env as unknown as T);
}

export function useLessonDiscussions(
  lessonId: string,
  channel: unknown,
  clearAIState: () => void,
  promptInput: string,
  setPromptInput: (value: string) => void,
  promptType: PromptType,
  studentCount: number = 0
) {
  const [discussions, setDiscussions] = useState<DiscussionWithResponseCount[]>([]);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [isClosingDiscussion, setIsClosingDiscussion] = useState(false);
  const closingRef = useRef(false);

  // Peak student count tracking
  const peakStudentCountRef = useRef<number>(0);
  const [peakStudentCount, setPeakStudentCount] = useState<number>(0);

  useEffect(() => {
    if (activeDiscussion && studentCount > peakStudentCountRef.current) {
      peakStudentCountRef.current = studentCount;
      queueMicrotask(() => setPeakStudentCount(prev => Math.max(prev, studentCount)));
    }
  }, [studentCount, activeDiscussion]);

  const fetchDiscussions = useCallback(async () => {
    const data = await fetchDiscussionsApi(lessonId);
    setDiscussions(data);
    const active = data.find((d) => d.status === 'active');
    setActiveDiscussion(active || null);
  }, [lessonId]);

  // Timer Management
  const {
    timerEndTime,
    timerSeconds,
    setTimerState,
    clearTimerState,
    handleExtendTimer,
    handleEditTimer
  } = useDiscussionTimerInternal(activeDiscussion, channel);

  const handleCloseDiscussion = useCallback(async (discussionId: string) => {
    // Guard against double-invocation from rapid clicks or a race with the
    // auto-close timer. Both the ref (synchronous) and state (for UI) are set.
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosingDiscussion(true);
    try {
      const peak = peakStudentCountRef.current;
      if (peak > 0) await updateParticipantSnapshotApi(discussionId, peak);
      peakStudentCountRef.current = 0;
      setPeakStudentCount(0);
      clearTimerState();
      await closeDiscussionApi(discussionId);
      if (channel) {
        await (channel as RealtimeLikeChannel).send({
          type: 'broadcast',
          event: 'discussion:closed',
          payload: { discussionId },
        });
      }
      setActiveDiscussion(null);
      await fetchDiscussions();
    } finally {
      closingRef.current = false;
      setIsClosingDiscussion(false);
    }
  }, [channel, fetchDiscussions, clearTimerState]);

  // Check for auto-close
  const autoCloseCalledRef = useRef(false);
  useEffect(() => {
    if (!timerEndTime || !activeDiscussion?.id) return;
    const interval = setInterval(() => {
      if (Date.now() >= timerEndTime && !autoCloseCalledRef.current) {
        autoCloseCalledRef.current = true;
        handleCloseDiscussion(activeDiscussion.id);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [timerEndTime, activeDiscussion?.id, handleCloseDiscussion]);

  // ── Timer state restore (reconnect / tab-switch fix) ──────────────────────
  // Problem: React state (timerEndTime) is lost when the component remounts, the instructor
  // switches browser tabs, or the WebSocket reconnects and fetchDiscussions() re-runs.
  // Without this effect the timer becomes null, the auto-close interval never fires,
  // and the discussion stays open past its deadline.
  //
  // Solution: whenever activeDiscussion changes identity or its timer fields update,
  // recompute timerEndTime directly from the DB values (published_at + time_limit_seconds).
  // Resetting autoCloseCalledRef ensures the interval above fires immediately on the next
  // 500 ms tick if the deadline has already passed while we were disconnected.
  useEffect(() => {
    if (activeDiscussion?.time_limit_seconds && activeDiscussion.published_at) {
      const endTime = new Date(activeDiscussion.published_at).getTime() + activeDiscussion.time_limit_seconds * 1000;
      setTimerState(endTime, activeDiscussion.time_limit_seconds);
      autoCloseCalledRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiscussion?.id, activeDiscussion?.time_limit_seconds, activeDiscussion?.published_at]);

  // Response Management
  const {
    responses,
    setResponses,
    flaggedResponses,
    fetchResponses,
    removeResponse,
    restoreResponse
  } = useResponseManagementInternal(activeDiscussion, setDiscussions);

  // Real-time listener
  useEffect(() => {
    if (!channel) return;
    const sub = (channel as RealtimeLikeChannel).on('broadcast', { event: 'response:new' }, (raw) => {
      const data = unwrapBroadcast<{ response: Response }>(raw);
      if (data?.response) handleNewResponse(data.response, setResponses, setDiscussions);
    });
    return () => sub.unsubscribe();
  }, [channel, setResponses]);

  const handlePublishDiscussion = useCallback(async (timerSecs: number | null = null, multipleResponseSettings?: { allowMultipleResponses: boolean; responseLimit: number | null }) => {
    if (!promptInput.trim() || publishing) return;
    setPublishing(true);
    if (activeDiscussion) await handleCloseDiscussion(activeDiscussion.id);
    peakStudentCountRef.current = studentCount;
    setPeakStudentCount(studentCount);

    const payload = {
      lesson_id: lessonId, prompt_text: promptInput, prompt_type: promptType,
      status: 'active', published_at: new Date().toISOString(),
      display_order: discussions.length, source: 'manual',
      participant_snapshot: studentCount > 0 ? studentCount : null,
      time_limit_seconds: timerSecs,
      allow_multiple_responses: multipleResponseSettings?.allowMultipleResponses ?? false,
      response_limit: multipleResponseSettings ? multipleResponseSettings.responseLimit : 1,
    };

    const newDiscussion = await insertDiscussionApi(payload);
    if (!newDiscussion) { setPublishing(false); return; }

    if (channel) {
      await (channel as RealtimeLikeChannel).send({ type: 'broadcast', event: 'discussion:published', payload: { discussion: newDiscussion } });
    }

    if (timerSecs && timerSecs > 0) {
      const endTime = new Date(newDiscussion.published_at!).getTime() + timerSecs * 1000;
      setTimerState(endTime, timerSecs);
      autoCloseCalledRef.current = false;
    }

    setActiveDiscussion(newDiscussion);
    setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
    setResponses([]);
    setPromptInput('');
    setPublishing(false);
  }, [promptInput, publishing, promptType, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, setPromptInput, setTimerState, setResponses]);

  const handlePublishAiCandidate = useCallback(async (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled: boolean = false, timerSecs: number | null = null, multipleResponseSettings?: { allowMultipleResponses: boolean; responseLimit: number | null }) => {
    if (publishing) return;
    setPublishing(true);
    if (activeDiscussion) await handleCloseDiscussion(activeDiscussion.id);
    peakStudentCountRef.current = studentCount;
    setPeakStudentCount(studentCount);

    const aiSuggestedCorrectOption = candidate.mcOptions?.find(o => o.is_correct)?.label || null;
    const finalCorrectOption = overrideCorrectOption || aiSuggestedCorrectOption;
    const finalMcOptions = candidate.mcOptions ? candidate.mcOptions.map(opt => ({ ...opt, is_correct: opt.label === finalCorrectOption })) : null;

    const payload = {
      lesson_id: lessonId, prompt_text: candidate.promptText, prompt_type: candidate.promptType,
      status: 'active', published_at: new Date().toISOString(),
      display_order: discussions.length, source: 'ai_generated',
      mc_options: finalMcOptions, correct_option: finalCorrectOption,
      feedback_enabled: feedbackEnabled, ai_generated_correct_option: aiSuggestedCorrectOption,
      participant_snapshot: studentCount > 0 ? studentCount : null,
      time_limit_seconds: timerSecs,
      allow_multiple_responses: multipleResponseSettings?.allowMultipleResponses ?? false,
      response_limit: multipleResponseSettings ? multipleResponseSettings.responseLimit : 1,
    };

    const newDiscussion = await insertDiscussionApi(payload);
    if (!newDiscussion) { setPublishing(false); return; }

    if (channel) {
      const studentSafe = {
        ...newDiscussion,
        mc_options: candidate.mcOptions ? candidate.mcOptions.map(({ label, text }: { label: string; text: string }) => ({ label, text })) : null
      };
      await (channel as RealtimeLikeChannel).send({ type: 'broadcast', event: 'discussion:published', payload: { discussion: studentSafe } });
    }

    if (timerSecs && timerSecs > 0) {
      const endTime = new Date(newDiscussion.published_at!).getTime() + timerSecs * 1000;
      setTimerState(endTime, timerSecs);
      autoCloseCalledRef.current = false;
    }

    setActiveDiscussion(newDiscussion);
    setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
    setResponses([]);
    clearAIState();
    setPublishing(false);
  }, [publishing, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, clearAIState, setTimerState, setResponses]);

  const handleRestartDiscussion = useCallback(async (
    original: Discussion,
    timerSecs: number | null = null,
    feedbackEnabled: boolean = false,
    multipleResponseSettings?: { allowMultipleResponses: boolean; responseLimit: number | null }
  ) => {
    if (publishing) return;
    setPublishing(true);
    if (activeDiscussion) await handleCloseDiscussion(activeDiscussion.id);
    peakStudentCountRef.current = studentCount;
    setPeakStudentCount(studentCount);

    const payload = {
      lesson_id: lessonId,
      prompt_text: original.prompt_text,
      prompt_type: original.prompt_type,
      status: 'active',
      published_at: new Date().toISOString(),
      display_order: discussions.length,
      source: original.source,
      mc_options: original.mc_options,
      correct_option: original.correct_option,
      feedback_enabled: feedbackEnabled,
      participant_snapshot: studentCount > 0 ? studentCount : null,
      time_limit_seconds: timerSecs,
      allow_multiple_responses: multipleResponseSettings?.allowMultipleResponses ?? original.allow_multiple_responses,
      response_limit: multipleResponseSettings ? multipleResponseSettings.responseLimit : original.response_limit,
    };

    const newDiscussion = await insertDiscussionApi(payload);
    if (!newDiscussion) { setPublishing(false); return; }

    if (channel) {
      await (channel as RealtimeLikeChannel).send({
        type: 'broadcast',
        event: 'discussion:published',
        payload: { discussion: newDiscussion }
      });
    }

    if (timerSecs && timerSecs > 0) {
      const endTime = new Date(newDiscussion.published_at!).getTime() + timerSecs * 1000;
      setTimerState(endTime, timerSecs);
      autoCloseCalledRef.current = false;
    }

    setActiveDiscussion(newDiscussion);
    setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
    setResponses([]);
    setPublishing(false);
  }, [publishing, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, setTimerState, setResponses]);

  return {
    peakStudentCount, discussions, activeDiscussion, responses,
    discussionTimerEndTime: timerEndTime, discussionTimerSeconds: timerSeconds, flaggedResponses,
    fetchDiscussions, fetchResponses, handleCloseDiscussion, isClosingDiscussion,
    handlePublishDiscussion, handlePublishAiCandidate, handleExtendTimer, handleEditTimer,
    handleRestartDiscussion, removeResponse, restoreResponse,
  };
}

// ─── Internal Helper Hooks ────────────────────────────────────────────────────

function useDiscussionTimerInternal(activeDiscussion: Discussion | null, channel: unknown) {
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);

  const setTimerState = useCallback((end: number, secs: number) => {
    setTimerEndTime(end);
    setTimerSeconds(secs);
  }, []);

  const clearTimerState = useCallback(() => {
    setTimerEndTime(null);
    setTimerSeconds(null);
  }, []);

  const handleExtendTimer = useCallback(async (extraSeconds: number) => {
    if (!activeDiscussion?.id || !activeDiscussion.published_at) return;
    const publishedAt = activeDiscussion.published_at;
    const newEndTime = (timerEndTime ?? Date.now()) + extraSeconds * 1000;
    const newLimit = Math.round((newEndTime - new Date(publishedAt).getTime()) / 1000);
    setTimerEndTime(newEndTime);
    setTimerSeconds(newLimit);
    await updateDiscussionTimerApi(activeDiscussion.id, newLimit, publishedAt);
    if (channel) await (channel as RealtimeLikeChannel).send({ type: 'broadcast', event: 'discussion:timer_updated', payload: { discussionId: activeDiscussion.id, time_limit_seconds: newLimit, published_at: publishedAt } });
  }, [activeDiscussion, timerEndTime, channel]);

  const handleEditTimer = useCallback(async (newSecs: number | null) => {
    if (!activeDiscussion?.id) return;
    if (!newSecs || newSecs <= 0) {
      clearTimerState();
      const supabase = (await import('@/lib/supabase/client')).createClient();
      await supabase.from('discussions').update({ time_limit_seconds: null }).eq('id', activeDiscussion.id);
      if (channel) await (channel as RealtimeLikeChannel).send({ type: 'broadcast', event: 'discussion:timer_updated', payload: { discussionId: activeDiscussion.id, time_limit_seconds: null, published_at: null } });
      return;
    }
    const newPubAt = new Date().toISOString();
    const newEnd = Date.now() + newSecs * 1000;
    setTimerState(newEnd, newSecs);
    await updateDiscussionTimerApi(activeDiscussion.id, newSecs, newPubAt);
    if (channel) await (channel as RealtimeLikeChannel).send({ type: 'broadcast', event: 'discussion:timer_updated', payload: { discussionId: activeDiscussion.id, time_limit_seconds: newSecs, published_at: newPubAt } });
  }, [activeDiscussion, channel, setTimerState, clearTimerState]);

  return { timerEndTime, timerSeconds, setTimerState, clearTimerState, handleExtendTimer, handleEditTimer };
}

function useResponseManagementInternal(
  activeDiscussion: Discussion | null,
  setDiscussions: (fn: (prev: DiscussionWithResponseCount[]) => DiscussionWithResponseCount[]) => void
) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [flaggedResponses, setFlaggedResponses] = useState<Response[]>([]);

  const fetchResponses = useCallback(async () => {
    if (!activeDiscussion) {
      queueMicrotask(() => setResponses([]));
      return;
    }
    const data = await fetchResponsesApi(activeDiscussion.id);
    setResponses(data);
  }, [activeDiscussion]);

  const fetchFlaggedResponses = useCallback(async () => {
    if (!activeDiscussion) {
      queueMicrotask(() => setFlaggedResponses([]));
      return;
    }
    const data = await fetchFlaggedResponsesApi(activeDiscussion.id);
    setFlaggedResponses(data);
  }, [activeDiscussion]);

  useEffect(() => {
    const load = async () => {
      await fetchResponses();
      await fetchFlaggedResponses();
    };
    load();
  }, [activeDiscussion?.id, fetchResponses, fetchFlaggedResponses]);

  const removeResponse = useCallback(async (id: string) => {
    await flagResponseApi(id);
    setResponses(prev => {
      const item = prev.find(r => r.id === id);
      if (item) updateFlaggedResponses(item, setFlaggedResponses);
      return prev.filter(r => r.id !== id);
    });
    const updateCountFn = (prev: DiscussionWithResponseCount[]) => prev.map((d) => d.id === activeDiscussion?.id ? { ...d, response_count: Math.max((d.response_count ?? 1) - 1, 0) } : d);
    setDiscussions(updateCountFn);
  }, [activeDiscussion, setDiscussions]);

  const restoreResponse = useCallback(async (id: string) => {
    await unflagResponseApi(id);
    setFlaggedResponses(prev => {
      const item = prev.find(r => r.id === id);
      if (item) handleRestoredResponse(item, setResponses);
      return prev.filter(r => r.id !== id);
    });
    setDiscussions((prev: DiscussionWithResponseCount[]) => prev.map((d) => d.id === activeDiscussion?.id ? { ...d, response_count: (d.response_count ?? 0) + 1 } : d));
  }, [activeDiscussion, setDiscussions]);

  return { responses, setResponses, flaggedResponses, fetchResponses, removeResponse, restoreResponse };
}

// ─── Refactoring Helpers ──────────────────────────────────────────────────────

function handleNewResponse(
  response: Response,
  setResponses: (fn: (prev: Response[]) => Response[]) => void,
  setDiscussions: (fn: (prev: DiscussionWithResponseCount[]) => DiscussionWithResponseCount[]) => void
) {
  setResponses((prev: Response[]) => prev.some((r) => r.id === response.id) ? prev : [response, ...prev]);
  setDiscussions((prev: DiscussionWithResponseCount[]) => prev.map((d) => d.id === response.discussion_id ? { ...d, response_count: (d.response_count ?? 0) + 1 } : d));
}

function updateFlaggedResponses(item: Response, setFlaggedResponses: (fn: (prev: Response[]) => Response[]) => void) {
  setFlaggedResponses((f: Response[]) => f.some(r => r.id === item.id) ? f : [{ ...item, flagged_at: new Date().toISOString() }, ...f]);
}

function handleRestoredResponse(item: Response, setResponses: (fn: (prev: Response[]) => Response[]) => void) {
  setResponses((r: Response[]) => r.some(x => x.id === item.id) ? r : [{ ...item, flagged_at: null }, ...r]);
}
