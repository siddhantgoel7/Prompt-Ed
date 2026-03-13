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
    updateParticipantSnapshotApi,
    deleteResponseApi,
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
    const [publishing, setPublishing] = useState(false);

    // Tracks the highest student count seen while the current discussion is active.
    // Reset to 0 when a new discussion is published, saved as participant_snapshot on close.
    const peakStudentCountRef = useRef<number>(0);
    // Reactive state mirror of the ref — triggers re-renders so UI stays in sync
    const [peakStudentCount, setPeakStudentCount] = useState<number>(0);

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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchResponses();
    }, [activeDiscussion?.id, fetchResponses]);

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

    const handlePublishDiscussion = useCallback(async () => {
        if (!promptInput.trim() || publishing) return;
        setPublishing(true);

        if (activeDiscussion) {
            await handleCloseDiscussion(activeDiscussion.id);
        }

        // Seed peak with current count for the new discussion
        peakStudentCountRef.current = studentCount;
        setPeakStudentCount(studentCount);

        const payload = {
            lesson_id: lessonId,
            prompt_text: promptInput,
            prompt_type: promptType,
            status: 'active',
            published_at: new Date().toISOString(),
            display_order: discussions.length,
            source: 'manual',
            // Seed with current count; will be updated to peak on close
            participant_snapshot: studentCount > 0 ? studentCount : null,
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

        setActiveDiscussion(newDiscussion);
        setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
        setResponses([]);
        setPromptInput('');
        setPublishing(false);
    }, [promptInput, publishing, promptType, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, setPromptInput]);

    const removeResponse = useCallback(async (responseId: string) => {
        await deleteResponseApi(responseId);
        setResponses((prev) => prev.filter((r) => r.id !== responseId));
        setDiscussions((prev) =>
            prev.map((d) =>
                d.id === activeDiscussion?.id
                    ? { ...d, response_count: Math.max((d.response_count ?? 1) - 1, 0) }
                    : d
            )
        );
    }, [activeDiscussion]);

    const handlePublishAiCandidate = useCallback(async (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled: boolean = false) => {
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

        setActiveDiscussion(newDiscussion);
        setDiscussions((prev) => [...prev, { ...newDiscussion, response_count: 0 }]);
        setResponses([]);
        clearAIState();
        setPublishing(false);
    }, [publishing, activeDiscussion, discussions.length, lessonId, channel, studentCount, handleCloseDiscussion, clearAIState]);

    return {
        peakStudentCount,
        discussions,
        activeDiscussion,
        responses,
        fetchDiscussions,
        fetchResponses,
        handleCloseDiscussion,
        handlePublishDiscussion,
        handlePublishAiCandidate,
        removeResponse,
    };
}