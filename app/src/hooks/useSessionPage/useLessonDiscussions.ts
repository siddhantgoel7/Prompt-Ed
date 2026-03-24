import { useState, useCallback, useEffect, useRef } from 'react';
import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

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
    // Live student count from Realtime Presence — used to track peak during a discussion
    studentCount: number = 0
) {
    const [discussions, setDiscussions] = useState<DiscussionWithResponseCount[]>([]);
    const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [flaggedResponses, setFlaggedResponses] = useState<Response[]>([]);
    const [publishing, setPublishing] = useState(false);

    // Tracks the highest student count seen while the current discussion is active.
    // Reset to 0 when a new discussion is published, saved as participant_snapshot on close.
    const peakStudentCountRef = useRef<number>(0);
    // Reactive state mirror of the ref — triggers re-renders so UI stays in sync
    const [peakStudentCount, setPeakStudentCount] = useState<number>(0);

    // Timer state: end time (ms since epoch) and total seconds for the active discussion
    const [discussionTimerEndTime, setDiscussionTimerEndTime] = useState<number | null>(null);
    const [discussionTimerSeconds, setDiscussionTimerSeconds] = useState<number | null>(null);
    // Ref to active discussion id for use in timer interval callback without stale closure
    const activeDiscussionIdRef = useRef<string | null>(null);
    const autoCloseCalledRef = useRef(false);

    // Whenever studentCount changes and a discussion is active, update the peak if higher
    useEffect(() => {
        if (activeDiscussion && studentCount > peakStudentCountRef.current) {
            peakStudentCountRef.current = studentCount;
            // queueMicrotask defers the setState call to after the current effect finishes,
            // preventing React strict-mode from flagging a state update triggered during
            // an effect that itself was caused by a state change (ref update + setState in
            // the same synchronous frame). The ref is already updated above so the peak
            // value is consistent regardless of when the re-render occurs.
            queueMicrotask(() => {
                setPeakStudentCount(prev => Math.max(prev, studentCount));
            });
        }
    }, [studentCount, activeDiscussion]);

    const fetchDiscussions = useCallback(async () => {
        const data = await fetchDiscussionsApi(lessonId);
        setDiscussions(data);
        const active = data.find((d) => d.status === 'active');
        setActiveDiscussion(active || null);

        // Restore timer state from DB so the auto-close interval keeps working after
        // a reconnect, a tab switch, or a page remount — cases where React state is
        // lost but the discussion is still active in the DB.
        if (active?.time_limit_seconds && active.published_at) {
            const endTime = new Date(active.published_at).getTime() + active.time_limit_seconds * 1000;
            activeDiscussionIdRef.current = active.id;
            autoCloseCalledRef.current = false; // allow auto-close to re-evaluate
            setDiscussionTimerEndTime(endTime);
            setDiscussionTimerSeconds(active.time_limit_seconds);
        } else if (!active) {
            setDiscussionTimerEndTime(null);
            setDiscussionTimerSeconds(null);
            activeDiscussionIdRef.current = null;
        }
        // Responses are fetched by the activeDiscussion?.id useEffect below
    }, [lessonId]);

    const fetchResponses = useCallback(async () => {
        if (!activeDiscussion) {
            Promise.resolve().then(() => setResponses([]));
            return;
        }
        const data = await fetchResponsesApi(activeDiscussion.id);
        setResponses(data);
    }, [activeDiscussion]);

    const fetchFlaggedResponses = useCallback(async () => {
        if (!activeDiscussion) {
            Promise.resolve().then(() => setFlaggedResponses([]));
            return;
        }
        const data = await fetchFlaggedResponsesApi(activeDiscussion.id);
        setFlaggedResponses(data);
    }, [activeDiscussion]);

    useEffect(() => {
        fetchResponses();
        fetchFlaggedResponses();
    }, [activeDiscussion?.id, fetchResponses, fetchFlaggedResponses]);

    useEffect(() => {
        if (!channel) return;
        const ch = channel as RealtimeLikeChannel;
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

    const handleCloseDiscussion = useCallback(async (discussionId: string) => {
        // Save the peak student count seen during this discussion as participant_snapshot
        const peak = peakStudentCountRef.current;
        if (peak > 0) {
            await updateParticipantSnapshotApi(discussionId, peak);
        }

        // Reset peak for the next discussion
        peakStudentCountRef.current = 0;
        setPeakStudentCount(0);

        // Clear timer state
        setDiscussionTimerEndTime(null);
        setDiscussionTimerSeconds(null);
        activeDiscussionIdRef.current = null;
        autoCloseCalledRef.current = false;

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
    }, [channel, fetchDiscussions]);

    // Auto-close discussion when timer expires (instructor side)
    useEffect(() => {
        if (!discussionTimerEndTime) return;

        const interval = setInterval(() => {
            if (Date.now() >= discussionTimerEndTime && activeDiscussionIdRef.current && !autoCloseCalledRef.current) {
                autoCloseCalledRef.current = true;
                handleCloseDiscussion(activeDiscussionIdRef.current);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [discussionTimerEndTime, handleCloseDiscussion]);

    const handlePublishDiscussion = useCallback(async (timerSeconds: number | null = null) => {
        if (!promptInput.trim() || publishing) return;
        setPublishing(true);

        if (activeDiscussion) {
            await handleCloseDiscussion(activeDiscussion.id);
        }

        // Seed peak with current count for the new discussion
        peakStudentCountRef.current = studentCount;
        setPeakStudentCount(studentCount);

        const publishedAt = new Date().toISOString();
        const payload = {
            lesson_id: lessonId,
            prompt_text: promptInput,
            prompt_type: promptType,
            status: 'active',
            published_at: publishedAt,
            display_order: discussions.length,
            source: 'manual',
            // Seed with current count; will be updated to peak on close
            participant_snapshot: studentCount > 0 ? studentCount : null,
            time_limit_seconds: timerSeconds,
        };

        const newDiscussion = await insertDiscussionApi(payload);
        if (!newDiscussion) { setPublishing(false); return; }

        if (channel) {
            await (channel as RealtimeLikeChannel).send({
                type: 'broadcast',
                event: 'discussion:published',
                payload: { discussion: newDiscussion },
            });
        }

        // Set up timer if applicable
        if (timerSeconds && timerSeconds > 0) {
            const endTime = new Date(newDiscussion.published_at!).getTime() + timerSeconds * 1000;
            setDiscussionTimerEndTime(endTime);
            setDiscussionTimerSeconds(timerSeconds);
            activeDiscussionIdRef.current = newDiscussion.id;
            autoCloseCalledRef.current = false;
        }

        setActiveDiscussion(newDiscussion);
        setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
        setResponses([]);
        setPromptInput('');
        setPublishing(false);
    }, [promptInput, publishing, promptType, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, setPromptInput]);

    const removeResponse = useCallback(async (responseId: string) => {
        await flagResponseApi(responseId);
        // Capture the response via the functional updater (runs synchronously),
        // then add to flagged at the top level — React 18+ batches both updates
        // into a single render, preventing duplicate keys.
        let flaggedItem: Response | undefined;
        setResponses((prev) => {
            flaggedItem = prev.find((r) => r.id === responseId);
            return prev.filter((r) => r.id !== responseId);
        });
        if (flaggedItem) {
            const item = flaggedItem;
            setFlaggedResponses((prev) => {
                if (prev.some((r) => r.id === responseId)) return prev;
                return [{ ...item, flagged_at: new Date().toISOString() }, ...prev];
            });
        }
        setDiscussions((prev) =>
            prev.map((d) =>
                d.id === activeDiscussion?.id
                    ? { ...d, response_count: Math.max((d.response_count ?? 1) - 1, 0) }
                    : d
            )
        );
    }, [activeDiscussion]);

    const restoreResponse = useCallback(async (responseId: string) => {
        await unflagResponseApi(responseId);
        // Capture the response via the functional updater, then add to responses
        // at the top level so React batches both updates into a single render.
        let restoredItem: Response | undefined;
        setFlaggedResponses((prev) => {
            restoredItem = prev.find((r) => r.id === responseId);
            return prev.filter((r) => r.id !== responseId);
        });
        if (restoredItem) {
            const item = restoredItem;
            setResponses((prev) => {
                if (prev.some((r) => r.id === responseId)) return prev;
                return [{ ...item, flagged_at: null }, ...prev];
            });
        }
        setDiscussions((prev) =>
            prev.map((d) =>
                d.id === activeDiscussion?.id
                    ? { ...d, response_count: (d.response_count ?? 0) + 1 }
                    : d
            )
        );
    }, [activeDiscussion]);

    const handlePublishAiCandidate = useCallback(async (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled: boolean = false, timerSeconds: number | null = null) => {
        if (publishing) return;
        setPublishing(true);

        if (activeDiscussion) {
            await handleCloseDiscussion(activeDiscussion.id);
        }

        // Seed peak with current count for the new discussion
        peakStudentCountRef.current = studentCount;
        setPeakStudentCount(studentCount);

        let aiSuggestedCorrectOption = null;
        if (candidate.mcOptions) {
            const correctOpt = candidate.mcOptions.find(o => o.is_correct);
            if (correctOpt) {
                aiSuggestedCorrectOption = correctOpt.label;
            }
        }

        const finalCorrectOption = overrideCorrectOption || aiSuggestedCorrectOption;
        const finalMcOptions = candidate.mcOptions ? candidate.mcOptions.map(opt => ({
            ...opt,
            is_correct: opt.label === finalCorrectOption
        })) : null;

        const payload = {
            lesson_id: lessonId,
            prompt_text: candidate.promptText,
            prompt_type: candidate.promptType,
            status: 'active',
            published_at: new Date().toISOString(),
            display_order: discussions.length,
            source: 'ai_generated',
            mc_options: finalMcOptions,
            correct_option: finalCorrectOption,
            feedback_enabled: feedbackEnabled,
            ai_generated_correct_option: aiSuggestedCorrectOption,
            // Seed with current count; will be updated to peak on close
            participant_snapshot: studentCount > 0 ? studentCount : null,
            time_limit_seconds: timerSeconds,
        };

        const newDiscussion = await insertDiscussionApi(payload);
        if (!newDiscussion) { setPublishing(false); return; }

        if (channel) {
            const studentSafe = {
                ...newDiscussion,
                mc_options: candidate.mcOptions
                    ? candidate.mcOptions.map(({ label, text }: { label: string; text: string }) => ({ label, text }))
                    : null,
            };
            await (channel as RealtimeLikeChannel).send({
                type: 'broadcast',
                event: 'discussion:published',
                payload: { discussion: studentSafe },
            });
        }

        // Set up timer if applicable
        if (timerSeconds && timerSeconds > 0) {
            const endTime = new Date(newDiscussion.published_at!).getTime() + timerSeconds * 1000;
            setDiscussionTimerEndTime(endTime);
            setDiscussionTimerSeconds(timerSeconds);
            activeDiscussionIdRef.current = newDiscussion.id;
            autoCloseCalledRef.current = false;
        }

        setActiveDiscussion(newDiscussion);
        setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
        setResponses([]);
        clearAIState();
        setPublishing(false);
    }, [publishing, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, clearAIState]);

    /** Adds extraSeconds to the current timer end time (keeps same published_at anchor). */
    const handleExtendTimer = useCallback(async (extraSeconds: number) => {
        if (!activeDiscussion?.id || !activeDiscussion.published_at) return;

        const publishedAt = activeDiscussion.published_at;
        const currentEndTime = discussionTimerEndTime ?? Date.now();
        const newEndTime = currentEndTime + extraSeconds * 1000;
        // Recalculate total seconds from original published_at so anchor stays consistent
        const newTimeLimitSeconds = Math.round((newEndTime - new Date(publishedAt).getTime()) / 1000);

        setDiscussionTimerEndTime(newEndTime);
        setDiscussionTimerSeconds(newTimeLimitSeconds);
        // Allow auto-close to fire again at the new end time
        autoCloseCalledRef.current = false;

        await updateDiscussionTimerApi(activeDiscussion.id, newTimeLimitSeconds, publishedAt);

        if (channel) {
            await (channel as RealtimeLikeChannel).send({
                type: 'broadcast',
                event: 'discussion:timer_updated',
                payload: { discussionId: activeDiscussion.id, time_limit_seconds: newTimeLimitSeconds, published_at: publishedAt },
            });
        }
    }, [activeDiscussion, discussionTimerEndTime, channel]);

    /** Replaces the timer with a brand-new countdown of newSeconds starting from now, or removes it if newSeconds is null. */
    const handleEditTimer = useCallback(async (newSeconds: number | null) => {
        if (!activeDiscussion?.id) return;

        if (!newSeconds || newSeconds <= 0) {
            // Remove the timer entirely
            setDiscussionTimerEndTime(null);
            setDiscussionTimerSeconds(null);
            activeDiscussionIdRef.current = null;
            autoCloseCalledRef.current = false;

            const supabase = (await import('@/lib/supabase/client')).createClient();
            await supabase.from('discussions').update({ time_limit_seconds: null }).eq('id', activeDiscussion.id);

            if (channel) {
                await (channel as RealtimeLikeChannel).send({
                    type: 'broadcast',
                    event: 'discussion:timer_updated',
                    payload: { discussionId: activeDiscussion.id, time_limit_seconds: null, published_at: null },
                });
            }
            return;
        }

        const newPublishedAt = new Date().toISOString();
        const newEndTime = Date.now() + newSeconds * 1000;

        setDiscussionTimerEndTime(newEndTime);
        setDiscussionTimerSeconds(newSeconds);
        activeDiscussionIdRef.current = activeDiscussion.id;
        // Reset auto-close so it fires at the new end time
        autoCloseCalledRef.current = false;

        await updateDiscussionTimerApi(activeDiscussion.id, newSeconds, newPublishedAt);

        if (channel) {
            await (channel as RealtimeLikeChannel).send({
                type: 'broadcast',
                event: 'discussion:timer_updated',
                payload: { discussionId: activeDiscussion.id, time_limit_seconds: newSeconds, published_at: newPublishedAt },
            });
        }
    }, [activeDiscussion, channel]);

    return {
        peakStudentCount,
        discussions,
        activeDiscussion,
        responses,
        discussionTimerEndTime,
        discussionTimerSeconds,
        flaggedResponses,
        fetchDiscussions,
        fetchResponses,
        handleCloseDiscussion,
        handlePublishDiscussion,
        handlePublishAiCandidate,
        handleExtendTimer,
        handleEditTimer,
        removeResponse,
        restoreResponse,
    };
}
