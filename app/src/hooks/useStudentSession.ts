// src/hooks/useStudentSession.ts
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';

import type { Discussion } from '@/types/discussion';
import type { Lesson } from '@/types/lesson';
import type { Response } from '@/types/response';

type ViewState = 'loading' | 'waiting' | 'active' | 'submitted' | 'ended' | 'error';

type BroadcastEnvelope<T> = { payload?: T } & Partial<T>;
function unwrapBroadcast<T>(payload: BroadcastEnvelope<T>): T | undefined {
  return (payload?.payload as T) ?? (payload as unknown as T);
}

type LessonEndedPayload = { message?: string };
type DiscussionPublishedPayload = { discussion: Discussion };
type DiscussionClosedPayload = { discussionId: string };
type ResponseNewPayload = { response: Response };

type RealtimeLikeChannel = {
  on: (
    type: 'broadcast',
    filter: { event: string },
    callback: (payload: unknown) => void
  ) => { unsubscribe: () => void };
  send: (message: unknown) => Promise<unknown>;
};

export function useStudentSession(lessonId: string) {
  const router = useRouter();
  const { channel, isConnected } = useRealtime(lessonId, 'student');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);

  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [endedMessage, setEndedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [view, setView] = useState<ViewState>('loading');

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

      const supabase = createClient();

      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (lessonError || !lessonData || (lessonData as { status?: string }).status !== 'active') {
        router.push('/');
        return;
      }

      if (cancelled) return;
      setLesson(lessonData as Lesson);

      const { data: discussionData, error: discussionError } = await supabase
        .from('discussions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('status', 'active')
        .maybeSingle();

      if (cancelled) return;

      if (discussionError) {
        console.error('Error fetching active discussion:', discussionError);
      }

      if (discussionData) {
        setActiveDiscussion(discussionData as Discussion);
        setResponseText('');
        setView('active');
      } else {
        setView('waiting');
      }
    }

    if (lessonId) boot();

    return () => {
      cancelled = true;
    };
  }, [lessonId, router]);

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
      setView('active');
    });

    const discussionClosedSub = ch.on('broadcast', { event: 'discussion:closed' }, (raw) => {
      const data = unwrapBroadcast<DiscussionClosedPayload>(
        raw as BroadcastEnvelope<DiscussionClosedPayload>
      );
      const discussionId = data?.discussionId;

      setActiveDiscussion((prev) => {
        if (!prev || prev.id !== discussionId) return prev;
        return { ...prev, status: 'closed' } as Discussion;
      });

      setView((prevView) => (prevView === 'active' ? 'waiting' : prevView));
    });

    return () => {
      lessonEndedSub.unsubscribe();
      discussionPublishedSub.unsubscribe();
      discussionClosedSub.unsubscribe();
    };
  }, [channel]);

  // 3) Submit response
  // responseTextOverride: for MC questions, the page passes the formatted option string directly so we don't race against the setState for responseText.
  const submitResponse = async (responseTextOverride?: string, selectedOptionOverride?: string, isCorrectOverride?: boolean) => {
    if (!activeDiscussion?.id) return;
    if (view !== 'active') return;

    const text = (responseTextOverride ?? responseText).trim();
    if (!text) return;

    setSubmitting(true);
    setErrorMessage(null);

    const supabase = createClient();

    const { data, error } = await supabase
      .from('responses')
      .insert([
        {
          discussion_id: activeDiscussion.id,
          response_text: text,
          selected_option: selectedOptionOverride ?? null,
          is_correct: isCorrectOverride ?? null,
        },
      ])
      .select()
      .single();

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
    setView('submitted');
  };

  useEffect(() => {
    if (view !== 'submitted') return;
  }, [view]);

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

    canSubmit,
    submitResponse,
  };
}