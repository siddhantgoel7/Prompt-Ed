import { useState, useCallback, useEffect } from 'react';
import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';
import type { GeneratedPrompt } from '@/types/ai';
import type { PromptType } from '@/types/discussion';

import {
    fetchDiscussionsApi,
    insertDiscussionApi,
    closeDiscussionApi,
    fetchResponsesApi
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
    promptType: PromptType
) {
    const [discussions, setDiscussions] = useState<DiscussionWithResponseCount[]>([]);
    const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
    const [responses, setResponses] = useState<Response[]>([]);
    const [publishing, setPublishing] = useState(false);

    const fetchDiscussions = useCallback(async () => {
        const data = await fetchDiscussionsApi(lessonId);
        setDiscussions(data);
        const active = data.find((d) => d.status === 'active');
        setActiveDiscussion(active || null);

        // Auto-fetch responses for the active discussion
        if (active) {
            const resData = await fetchResponsesApi(active.id);
            setResponses(resData);
        } else {
            setResponses([]);
        }
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

        const payload = {
            lesson_id: lessonId,
            prompt_text: promptInput,
            prompt_type: promptType,
            status: 'active',
            published_at: new Date().toISOString(),
            display_order: discussions.length,
            source: 'manual',
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
    }, [promptInput, publishing, promptType, activeDiscussion, discussions.length, lessonId, channel, handleCloseDiscussion, setPromptInput]);

    const handlePublishAiCandidate = useCallback(async (candidate: GeneratedPrompt, overrideCorrectOption?: string | null, feedbackEnabled: boolean = false) => {
        if (publishing) return;
        setPublishing(true);

        if (activeDiscussion) {
            await handleCloseDiscussion(activeDiscussion.id);
        }

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
    }, [publishing, activeDiscussion, discussions.length, lessonId, channel, handleCloseDiscussion, clearAIState]);

    return {
        discussions,
        activeDiscussion,
        responses,
        fetchDiscussions,
        fetchResponses,
        handleCloseDiscussion,
        handlePublishDiscussion,
        handlePublishAiCandidate
    };
}
