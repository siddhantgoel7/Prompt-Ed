// src/hooks/useStudentSession.ts
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';


import { useRealtime } from '@/lib/realtime/useRealtime';

import type { Discussion } from '@/types/discussion';
import type { Lesson } from '@/types/lesson';
import type { Response } from '@/types/response';
import { fetchLessonByIdApi } from '@/lib/api/lessonApi';
import { fetchStudentActiveDiscussionApi, submitStudentResponseApi } from '@/lib/api/discussionsApi';

type ViewState = 'loading' | 'waiting' | 'active' | 'submitted' | 'ended' | 'error';

type BroadcastEnvelope<T> = { payload?: T } & Partial<T>;
function unwrapBroadcast<T>(payload: BroadcastEnvelope<T>): T | undefined {
  return (payload?.payload as T) ?? (payload as unknown as T);
}

type LessonEndedPayload = { message?: string };
type DiscussionPublishedPayload = { discussion: Discussion };
type DiscussionClosedPayload = { discussionId: string };
type ResponseNewPayload = { response: Response };
type TimerUpdatedPayload = { discussionId: string; time_limit_seconds: number | null; published_at: string | null };

type RealtimeLikeChannel = {
  on: (
    type: 'broadcast',
    filter: { event: string },
    callback: (payload: unknown) => void
  ) => { unsubscribe: () => void };
  send: (message: unknown) => Promise<unknown>;
};

// Persistence helpers
function getSubmittedDiscussionIdsFromStorage(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function hasSubmittedDiscussionInStorage(storageKey: string, discussionId: string): boolean {
  return getSubmittedDiscussionIdsFromStorage(storageKey).includes(discussionId);
}

function markDiscussionSubmittedInStorage(storageKey: string, discussionId: string): void {
  try {
    const ids = new Set(getSubmittedDiscussionIdsFromStorage(storageKey));
    ids.add(discussionId);
    localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch {
    // Non-fatal
  }
}

function getResponseCountFromStorage(storageKey: string, discussionId: string): number {
  try {
    const raw = localStorage.getItem(`${storageKey}:${discussionId}:count`);
    return raw ? Number.parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function setResponseCountInStorage(storageKey: string, discussionId: string, count: number): void {
  try {
    localStorage.setItem(`${storageKey}:${discussionId}:count`, count.toString());
  } catch {
    // Non-fatal
  }
}

function getSavedResponseFromStorage(storageKey: string, discussionId: string): { responseText?: string; selectedOption?: string; isCorrect?: boolean } | null {
  try {
    const raw = localStorage.getItem(`${storageKey}:${discussionId}:response`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setSavedResponseInStorage(storageKey: string, discussionId: string, data: { responseText?: string; selectedOption?: string; isCorrect?: boolean }): void {
  try {
    localStorage.setItem(`${storageKey}:${discussionId}:response`, JSON.stringify(data));
  } catch {
    // Non-fatal
  }
}

function getDraftFromStorage(storageKey: string, discussionId: string): { responseText?: string; selectedOption?: string } | null {
  try {
    const raw = localStorage.getItem(`${storageKey}:${discussionId}:draft`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setDraftInStorage(storageKey: string, discussionId: string, data: { responseText?: string; selectedOption?: string }): void {
  try {
    localStorage.setItem(`${storageKey}:${discussionId}:draft`, JSON.stringify(data));
  } catch {
    // Non-fatal
  }
}

function clearDraftFromStorage(storageKey: string, discussionId: string): void {
  try {
    localStorage.removeItem(`${storageKey}:${discussionId}:draft`);
  } catch {
    // Non-fatal
  }
}

export function useStudentSession(lessonId: string) {
  const router = useRouter();
  const { channel, isConnected } = useRealtime(lessonId, 'student');
  const submittedDiscussionsKey = `student:${lessonId}:submitted-discussions`;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);

  // Response state
  const [responseText, setResponseText] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitCorrect, setIsSubmitCorrect] = useState<boolean | null>(null);
  const [submittedAnswerText, setSubmittedAnswerText] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [feedbackPeriodActive, setFeedbackPeriodActive] = useState(false);

  const [view, setView] = useState<ViewState>('loading');

  // Timer state
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerExpiredRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for callbacks
  const viewRef = useRef<ViewState>('loading');
  const activeDiscussionRef = useRef<Discussion | null>(null);
  const timerEndTimeRef = useRef<number | null>(null);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { activeDiscussionRef.current = activeDiscussion; }, [activeDiscussion]);
  useEffect(() => { timerEndTimeRef.current = timerEndTime; }, [timerEndTime]);

  // Persist draft on every change
  useEffect(() => {
    if (activeDiscussion?.id && view === 'active') {
      setDraftInStorage(submittedDiscussionsKey, activeDiscussion.id, {
        responseText,
        selectedOption: selectedOption ?? undefined
      });
    }
  }, [submittedDiscussionsKey, activeDiscussion?.id, view, responseText, selectedOption]);

  const canSubmit = useMemo(() => {
    return (
      view === 'active' &&
      !submitting &&
      isConnected &&
      Boolean(activeDiscussion?.id) &&
      (activeDiscussion?.prompt_type === 'multiple_choice' ? Boolean(selectedOption) : responseText.trim().length > 0)
    );
  }, [view, submitting, isConnected, activeDiscussion, responseText, selectedOption]);

  const submitResponse = useCallback(async (textOverride?: string, optionOverride?: string, isCorrectOverride?: boolean) => {
    const currentDiscussion = activeDiscussionRef.current;
    if (!currentDiscussion?.id || viewRef.current !== 'active' || submitting) return;

    const isMC = currentDiscussion.prompt_type === 'multiple_choice';
    const text = (textOverride ?? responseText).trim();
    const opt = optionOverride ?? selectedOption;
    const corr = isCorrectOverride ?? (isMC && opt ? opt === currentDiscussion.correct_option : null);

    if (!text && !isMC) return;
    if (isMC && !opt) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { data, error } = await submitStudentResponseApi(
      currentDiscussion.id,
      text,
      opt,
      corr,
    );

    const newResponse = data as Response | null;

    if (error || !newResponse) {
      console.error('Error submitting response:', error);
      setErrorMessage('Could not submit your response. Please try again.');
      setSubmitting(false);
      return;
    }

    if (channel) {
      const ch = channel as unknown as RealtimeLikeChannel;
      await ch.send({
        type: 'broadcast',
        event: 'response:new',
        payload: { response: newResponse } satisfies ResponseNewPayload,
      });
    }

    setSubmitting(false);
    setResponseText('');
    const newCount = responseCount + 1;
    setResponseCount(newCount);
    setResponseCountInStorage(submittedDiscussionsKey, currentDiscussion.id, newCount);
    markDiscussionSubmittedInStorage(submittedDiscussionsKey, currentDiscussion.id);

    // Persist specifically what was submitted and clear draft
    setSavedResponseInStorage(submittedDiscussionsKey, currentDiscussion.id, {
      responseText: text,
      selectedOption: opt ?? undefined,
      isCorrect: corr ?? undefined
    });
    clearDraftFromStorage(submittedDiscussionsKey, currentDiscussion.id);

    setSubmittedAnswerText(text);
    if (isMC) {
      setIsSubmitCorrect(corr);
      setSelectedOption(opt);
    }

    setView('submitted');
  }, [channel, responseCount, responseText, selectedOption, submittedDiscussionsKey, submitting]);

  // 1) Boot
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setView('loading');
      setErrorMessage(null);

      const { data: lessonData, error: lessonError } = await fetchLessonByIdApi(lessonId);
      if (lessonError || !lessonData || (lessonData as { status?: string }).status !== 'active') {
        router.push('/');
        return;
      }
      if (cancelled) return;
      setLesson(lessonData as Lesson);

      const { data: discussionData, error: discussionError } = await fetchStudentActiveDiscussionApi(lessonId);
      if (cancelled) return;

      if (discussionError) console.error('Error fetching active discussion:', discussionError);

      if (discussionData) {
        const disc = discussionData as Discussion;
        setActiveDiscussion(disc);

        const isSubmitted = hasSubmittedDiscussionInStorage(submittedDiscussionsKey, disc.id);
        const count = getResponseCountFromStorage(submittedDiscussionsKey, disc.id);
        setResponseCount(count);

        if (isSubmitted) {
          const saved = getSavedResponseFromStorage(submittedDiscussionsKey, disc.id);
          if (saved) {
            setSubmittedAnswerText(saved.responseText ?? null);
            setSelectedOption(saved.selectedOption ?? null);
            setIsSubmitCorrect(saved.isCorrect ?? null);
          }
          setView('submitted');
        } else {
          // Hydrate draft if available
          const draft = getDraftFromStorage(submittedDiscussionsKey, disc.id);
          if (draft) {
             if (draft.responseText) setResponseText(draft.responseText);
             if (draft.selectedOption) setSelectedOption(draft.selectedOption);
          } else {
             setResponseText('');
             setSelectedOption(null);
          }
          setView('active');
        }

        if (disc.time_limit_seconds && disc.time_limit_seconds > 0 && disc.published_at) {
          const endTime = new Date(disc.published_at).getTime() + disc.time_limit_seconds * 1000;
          if (endTime > Date.now()) {
            setTimerEndTime(endTime);
            setTimerTotalSeconds(disc.time_limit_seconds);
          }
        }
      } else {
        setView('waiting');
      }
    }

    if (lessonId) boot();
    return () => { cancelled = true; };
  }, [lessonId, router, submittedDiscussionsKey]);

  // 2) Realtime
  useEffect(() => {
    if (!channel) return;
    const ch = channel as unknown as RealtimeLikeChannel;

    const lessonEndedSub = ch.on('broadcast', { event: 'lesson:ended' }, (raw) => {
      const data = unwrapBroadcast<LessonEndedPayload>(raw as BroadcastEnvelope<LessonEndedPayload>);
      setEndedMessage(data?.message || 'Lesson has ended');
      setActiveDiscussion(null);
      setResponseText('');
      setSelectedOption(null);
      setSubmitting(false);
      setView('ended');
    });

    const discussionPublishedSub = ch.on('broadcast', { event: 'discussion:published' }, (raw) => {
      const data = unwrapBroadcast<DiscussionPublishedPayload>(raw as BroadcastEnvelope<DiscussionPublishedPayload>);
      const disc = data?.discussion;
      if (!disc) return;

      setActiveDiscussion(disc);
      setResponseText('');
      setSelectedOption(null);
      setIsSubmitCorrect(null);
      setSubmittedAnswerText(null);
      setSubmitting(false);
      setResponseCount(0);

      const isSubmitted = hasSubmittedDiscussionInStorage(submittedDiscussionsKey, disc.id);
      if (isSubmitted) {
        const saved = getSavedResponseFromStorage(submittedDiscussionsKey, disc.id);
        if (saved) {
          setSubmittedAnswerText(saved.responseText ?? null);
          setSelectedOption(saved.selectedOption ?? null);
          setIsSubmitCorrect(saved.isCorrect ?? null);
        }
        setView('submitted');
      } else {
        // Discussion changed: draft reset is handled by setActiveDiscussion trigger
        setView('active');
      }
      setResponseCount(getResponseCountFromStorage(submittedDiscussionsKey, disc.id));

      setTimerExpired(false);
      timerExpiredRef.current = false;

      if (disc.time_limit_seconds && disc.time_limit_seconds > 0 && disc.published_at) {
        const endTime = new Date(disc.published_at).getTime() + disc.time_limit_seconds * 1000;
        setTimerEndTime(endTime);
        setTimerTotalSeconds(disc.time_limit_seconds);
      } else {
        setTimerEndTime(null);
        setTimerTotalSeconds(null);
      }
    });

    const discussionClosedSub = ch.on('broadcast', { event: 'discussion:closed' }, (raw) => {
      const data = unwrapBroadcast<DiscussionClosedPayload>(raw as BroadcastEnvelope<DiscussionClosedPayload>);
      const discId = data?.discussionId;

      const timerActuallyExpired = timerEndTimeRef.current != null && Date.now() >= timerEndTimeRef.current;
      const wasExpiredAndActive = timerActuallyExpired && viewRef.current === 'active';
      const disc = activeDiscussionRef.current;
      const isMCWithFeedback = disc?.prompt_type === 'multiple_choice' && !!disc?.feedback_enabled;

      setActiveDiscussion((prev) => (prev?.id === discId ? { ...prev, status: 'closed' } as Discussion : prev));
      setTimerEndTime(null);
      setTimerTotalSeconds(null);

      if (wasExpiredAndActive) {
        timerExpiredRef.current = true;
        setTimerExpired(true);
        if (!isMCWithFeedback) {
          setTimeout(() => {
            setTimerExpired(false);
            timerExpiredRef.current = false;
            setActiveDiscussion(null);
            setView('waiting');
          }, 5000);
        }
      } else {
        setTimerExpired(false);
        timerExpiredRef.current = false;
        if (viewRef.current === 'active') setView('waiting');
      }
    });

    const timerUpdatedSub = ch.on('broadcast', { event: 'discussion:timer_updated' }, (raw) => {
      const data = unwrapBroadcast<TimerUpdatedPayload>(raw as BroadcastEnvelope<TimerUpdatedPayload>);
      if (!data) return;
      if (!data.time_limit_seconds || !data.published_at) {
        setTimerEndTime(null);
        timerEndTimeRef.current = null;
        setTimerTotalSeconds(null);
        setTimerExpired(false);
        timerExpiredRef.current = false;
        return;
      }
      const newEndTime = new Date(data.published_at).getTime() + data.time_limit_seconds * 1000;
      setTimerEndTime(newEndTime);
      timerEndTimeRef.current = newEndTime;
      setTimerTotalSeconds(data.time_limit_seconds);
      if (newEndTime > Date.now()) {
        setTimerExpired(false);
        timerExpiredRef.current = false;
      }
    });

    return () => {
      lessonEndedSub.unsubscribe();
      discussionPublishedSub.unsubscribe();
      discussionClosedSub.unsubscribe();
      timerUpdatedSub.unsubscribe();
    };
  }, [channel, submittedDiscussionsKey]);

  // 3) Auto-submit on timer expiry
  useEffect(() => {
    if (!timerEndTime) return;
    const id = setInterval(() => {
      if (Date.now() >= timerEndTime && !timerExpiredRef.current) {
        timerExpiredRef.current = true;
        setTimerExpired(true);

        // Auto-submit if in active view and has some content (or is MC with selection)
        if (viewRef.current === 'active' && !submitting) {
          const disc = activeDiscussionRef.current;
          if (disc) {
            const isMC = disc.prompt_type === 'multiple_choice';
            const hasDraft = isMC ? Boolean(selectedOption) : responseText.trim().length > 0;
            if (hasDraft) {
               // We need to pass the values directly because closure captures old state
               const text = responseText.trim();
               const opt = selectedOption;
               if (isMC && opt) {
                 const optionText = disc.mc_options?.find(o => o.label === opt)?.text ?? '';
                 const isCorrect = opt === disc.correct_option;
                 submitResponse(`Option ${opt}: ${optionText}`, opt, isCorrect);
               } else if (!isMC && text) {
                 submitResponse(text);
               }
            }
          }
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [timerEndTime, responseText, selectedOption, submitting, submitResponse]);

  // 4) Feedback display period for MC
  const startedFeedbackForRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      timerExpired &&
      view === 'submitted' &&
      activeDiscussion?.id &&
      activeDiscussion?.prompt_type === 'multiple_choice' &&
      activeDiscussion?.feedback_enabled &&
      isSubmitCorrect !== null &&
      startedFeedbackForRef.current !== activeDiscussion.id
    ) {
      startedFeedbackForRef.current = activeDiscussion.id;
      // Wrap in setTimeout to avoid "setState in effect" warning if synchronous
      const timeoutId = setTimeout(() => setFeedbackPeriodActive(true), 0);
      
      const hideId = setTimeout(() => setFeedbackPeriodActive(false), 7000);
      feedbackTimerRef.current = hideId;
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(hideId);
      };
    }
  }, [timerExpired, view, activeDiscussion, isSubmitCorrect]);

  const submitAnotherResponse = () => {
    if (!activeDiscussion || !activeDiscussion.allow_multiple_responses) return;
    if (activeDiscussion.prompt_type === 'multiple_choice') return;
    if (activeDiscussion.response_limit && responseCount >= activeDiscussion.response_limit) return;
    setResponseText('');
    setView('active');
  };

  const canSubmitAnother = Boolean(
    activeDiscussion?.allow_multiple_responses &&
    activeDiscussion?.prompt_type !== 'multiple_choice' &&
    activeDiscussion?.status === 'active' &&
    (!activeDiscussion?.response_limit || responseCount < activeDiscussion.response_limit)
  );

  return {
    lesson, activeDiscussion, responseText, setResponseText, selectedOption, setSelectedOption,
    isSubmitCorrect, setIsSubmitCorrect, submittedAnswerText, setSubmittedAnswerText,
    submitting, isConnected, view, endedMessage, errorMessage,
    timerEndTime, timerTotalSeconds, timerExpired, canSubmit,
    submitResponse, submitAnotherResponse, canSubmitAnother, responseCount,
    feedbackPeriodActive, setFeedbackPeriodActive,
  };
}
