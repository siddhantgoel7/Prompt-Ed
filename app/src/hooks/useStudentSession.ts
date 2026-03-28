// src/hooks/useStudentSession.ts
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
    // Non-fatal: if storage fails, we still keep the current in-memory submitted state.
    }
}

function getResponseCountFromStorage(storageKey: string, discussionId: string): number {
    try {
        const raw = localStorage.getItem(`${storageKey}:${discussionId}:count`);
        return raw ? parseInt(raw, 10) : 0;
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

export function useStudentSession(lessonId: string) {
  const router = useRouter();
  const { channel, isConnected } = useRealtime(lessonId, 'student');
  const submittedDiscussionsKey = `student:${lessonId}:submitted-discussions`;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);

  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseCount, setResponseCount] = useState(0);

  const [view, setView] = useState<ViewState>('loading');

  // Timer state
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerExpiredRef = useRef(false);

  // Refs to read current values inside broadcast callbacks without stale closures
  const viewRef = useRef<ViewState>('loading');
  const activeDiscussionRef = useRef<Discussion | null>(null);
  const timerEndTimeRef = useRef<number | null>(null);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { activeDiscussionRef.current = activeDiscussion; }, [activeDiscussion]);
  useEffect(() => { timerEndTimeRef.current = timerEndTime; }, [timerEndTime]);

  const canSubmit = useMemo(() => {
    return (
      view === 'active' &&
      !submitting &&
      isConnected &&
      Boolean(activeDiscussion?.id) &&
      responseText.trim().length > 0
    );
  }, [view, submitting, isConnected, activeDiscussion?.id, responseText]);

  // 1) Boot: validate lesson + hydrate active discussion (if any)
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

      if (discussionError) {
        console.error('Error fetching active discussion:', discussionError);
      }

      if (discussionData) {
        const nextDiscussion = discussionData as Discussion;
        setActiveDiscussion(nextDiscussion);
        setResponseText('');
        setView(
          hasSubmittedDiscussionInStorage(submittedDiscussionsKey, nextDiscussion.id)
            ? 'submitted'
            : 'active'
        );
        setResponseCount(getResponseCountFromStorage(submittedDiscussionsKey, nextDiscussion.id));

        // Restore timer for late-joining students using published_at from DB
        if (nextDiscussion.time_limit_seconds && nextDiscussion.time_limit_seconds > 0 && nextDiscussion.published_at) {
          const endTime = new Date(nextDiscussion.published_at).getTime() + nextDiscussion.time_limit_seconds * 1000;
          if (endTime > Date.now()) {
            setTimerEndTime(endTime);
            setTimerTotalSeconds(nextDiscussion.time_limit_seconds);
          }
          // If endTime is in the past, timer already expired — leave timerEndTime null
          // (instructor auto-close will have fired already)
        }
      } else {
        setView('waiting');
      }
    }

    if (lessonId) boot();

    return () => {
      cancelled = true;
    };
  }, [lessonId, router, submittedDiscussionsKey]);

  // 2) Realtime listeners
  useEffect(() => {
    if (!channel) return;

    const ch = channel as unknown as RealtimeLikeChannel;

    const lessonEndedSub = ch.on('broadcast', { event: 'lesson:ended' }, (raw) => {
      const data = unwrapBroadcast<LessonEndedPayload>(raw as BroadcastEnvelope<LessonEndedPayload>);
      const message = data?.message || 'Lesson has ended';

      setEndedMessage(message);
      setActiveDiscussion(null);
      setResponseText('');
      setSubmitting(false);
      setView('ended');
    });

    const discussionPublishedSub = ch.on('broadcast', { event: 'discussion:published' }, (raw) => {
      const data = unwrapBroadcast<DiscussionPublishedPayload>(
        raw as BroadcastEnvelope<DiscussionPublishedPayload>
      );
      const discussion = data?.discussion;
      if (!discussion) return;

      setActiveDiscussion(discussion);
      setResponseText('');
      setSubmitting(false);
      setResponseCount(0);
      setView(
        hasSubmittedDiscussionInStorage(submittedDiscussionsKey, discussion.id)
          ? 'submitted'
          : 'active'
      );
      setResponseCount(getResponseCountFromStorage(submittedDiscussionsKey, discussion.id));

      setTimerExpired(false);
      timerExpiredRef.current = false;

      // Set up timer from discussion data
      if (discussion.time_limit_seconds && discussion.time_limit_seconds > 0 && discussion.published_at) {
        const endTime = new Date(discussion.published_at).getTime() + discussion.time_limit_seconds * 1000;
        setTimerEndTime(endTime);
        setTimerTotalSeconds(discussion.time_limit_seconds);
      } else {
        setTimerEndTime(null);
        setTimerTotalSeconds(null);
      }
    });

    const discussionClosedSub = ch.on('broadcast', { event: 'discussion:closed' }, (raw) => {
      const data = unwrapBroadcast<DiscussionClosedPayload>(
        raw as BroadcastEnvelope<DiscussionClosedPayload>
      );
      const discussionId = data?.discussionId;

      // Snapshot refs before any state updates.
      // Check timer expiry directly from the end-time ref rather than timerExpiredRef:
      // the auto-close broadcast can arrive before the student's 500ms interval fires,
      // so timerExpiredRef may still be false even though the time has passed.
      const timerActuallyExpired =
        timerEndTimeRef.current != null && Date.now() >= timerEndTimeRef.current;
      const wasExpiredAndActive = timerActuallyExpired && viewRef.current === 'active';
      const disc = activeDiscussionRef.current;
      const isMCWithFeedback = disc?.prompt_type === 'multiple_choice' && !!disc?.feedback_enabled;

      // Mark the discussion as closed but keep its data for the expired message
      setActiveDiscussion((prev) => {
        if (!prev || prev.id !== discussionId) return prev;
        return { ...prev, status: 'closed' } as Discussion;
      });

      // Stop the countdown UI
      setTimerEndTime(null);
      setTimerTotalSeconds(null);

      if (wasExpiredAndActive) {
        // Student was in active view when timer expired (never submitted).
        // Ensure timerExpired state is set (may not have been set yet due to the race
        // between the auto-close broadcast and the student's 500ms polling interval).
        timerExpiredRef.current = true;
        setTimerExpired(true);

        if (isMCWithFeedback) {
          // MC with correct-answer feedback: hold until the next discussion is published
          // (discussion:published resets timerExpired and switches view to active again)
        } else {
          // All other questions: show "no answer submitted" for 5 seconds then go to waiting
          setTimeout(() => {
            setTimerExpired(false);
            timerExpiredRef.current = false;
            setActiveDiscussion(null);
            setView('waiting');
          }, 5000);
        }
      } else {
        // Normal close (student submitted, or no timer expiry)
        setTimerExpired(false);
        timerExpiredRef.current = false;
        setView((prevView) => (prevView === 'active' ? 'waiting' : prevView));
      }
    });

    const timerUpdatedSub = ch.on('broadcast', { event: 'discussion:timer_updated' }, (raw) => {
      const data = unwrapBroadcast<TimerUpdatedPayload>(
        raw as BroadcastEnvelope<TimerUpdatedPayload>
      );
      if (!data) return;

      if (!data.time_limit_seconds || !data.published_at) {
        // Timer removed — switch to no-limit mode
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

      // If the new end time is in the future, the timer is no longer expired
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

  // 3) Submit response
  // responseTextOverride: for MC questions, the page passes the formatted option string directly so we don't race against the setState for responseText.
  const submitResponse = async (responseTextOverride?: string, selectedOptionOverride?: string, isCorrectOverride?: boolean) => {
    if (!activeDiscussion?.id) return;
    if (view !== 'active') return;

    const text = (responseTextOverride ?? responseText).trim();
    if (!text) return;

    setSubmitting(true);
    setErrorMessage(null);

    const { data, error } = await submitStudentResponseApi(
      activeDiscussion.id,
      text,
      selectedOptionOverride ?? null,
      isCorrectOverride ?? null,
    );

    const newResponse = data as Response | null;

    if (error || !newResponse) {
      console.error('Error submitting response to Supabase:', error);
      setErrorMessage('Could not submit your response. Please try again.');
      setSubmitting(false);
      return;
    }

    // Broadcast to instructor
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
    setResponseCountInStorage(submittedDiscussionsKey, activeDiscussion.id, newCount);
    markDiscussionSubmittedInStorage(submittedDiscussionsKey, activeDiscussion.id);
    setView('submitted');
  };

  // Allow the student to go back to the active view to submit another response
  const submitAnotherResponse = () => {
    if (!activeDiscussion) return;
    if (!activeDiscussion.allow_multiple_responses) return;
    if (activeDiscussion.prompt_type === 'multiple_choice') return;
    // Check response limit
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

  useEffect(() => {
    if (view !== 'submitted') return;
  }, [view]);

  // Detect timer expiry on student side
  useEffect(() => {
    if (!timerEndTime) return;

    const id = setInterval(() => {
      if (Date.now() >= timerEndTime && !timerExpiredRef.current) {
        timerExpiredRef.current = true;
        setTimerExpired(true);
      }
    }, 500);

    return () => clearInterval(id);
  }, [timerEndTime]);

  return {
    lesson,
    activeDiscussion,
    responseText,
    setResponseText,
    submitting,
    isConnected,

    view,
    endedMessage,
    errorMessage,

    timerEndTime,
    timerTotalSeconds,
    timerExpired,

    canSubmit,
    submitResponse,
    submitAnotherResponse,
    canSubmitAnother,
    responseCount,
  };
}
