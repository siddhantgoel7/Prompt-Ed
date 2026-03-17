import { createClient } from '@/lib/supabase/client';
import type { Discussion, DiscussionWithResponseCount } from '@/types/discussion';
import type { Response } from '@/types/response';

type DiscussionCountRow = Discussion & {
    responses?: Array<{ count: number }>;
};

export async function fetchDiscussionsApi(lessonId: string): Promise<DiscussionWithResponseCount[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('discussions')
        .select('*, responses:responses(count)')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: true });

    if (error || !data) return [];

    const rows = data as unknown as DiscussionCountRow[];
    return rows.map((d) => ({
        ...(d as Discussion),
        response_count: d.responses?.[0]?.count ?? 0,
    }));
}

export async function insertDiscussionApi(payload: unknown): Promise<Discussion | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('discussions')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Failed to insert discussion:', error);
        return null;
    }
    return data as Discussion;
}

export async function closeDiscussionApi(discussionId: string): Promise<void> {
    const supabase = createClient();
    await supabase
        .from('discussions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', discussionId);
}

export async function fetchResponsesApi(discussionId: string | null, ascending: boolean = false): Promise<Response[]> {
    if (!discussionId) return [];
    const supabase = createClient();
    const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('discussion_id', discussionId)
        .is('flagged_at', null)
        .order('created_at', { ascending });

    if (error || !data) return [];
    return data as Response[];
}

export async function closeActiveDiscussionsApi(lessonId: string, now: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('discussions')
        .update({ status: 'closed', closed_at: now })
        .eq('lesson_id', lessonId)
        .eq('status', 'active');
}

export async function fetchEndedDiscussionsApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('discussions')
        .select(`
            *,
            responses ( id, discussion_id, response_text, created_at, flagged_at )
        `)
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: true });
}

/** Updates time_limit_seconds and published_at for an active discussion (timer edit/extend). */
export async function updateDiscussionTimerApi(
    discussionId: string,
    timeLimitSeconds: number,
    publishedAt: string,
): Promise<Discussion | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('discussions')
        .update({ time_limit_seconds: timeLimitSeconds, published_at: publishedAt })
        .eq('id', discussionId)
        .select()
        .single();

    if (error) {
        console.error('Failed to update discussion timer:', error);
        return null;
    }
    return data as Discussion;
}

export async function updateParticipantSnapshotApi(discussionId: string, peak: number): Promise<void> {
    const supabase = createClient();
    await supabase
        .from('discussions')
        .update({ participant_snapshot: peak })
        .eq('id', discussionId);
}

export async function fetchExportDiscussionsApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('discussions')
        .select('prompt_text, created_at, responses ( response_text, created_at, flagged_at )')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: true });
}

export async function fetchStudentActiveDiscussionApi(lessonId: string) {
    const supabase = createClient();
    return supabase
        .from('discussions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('status', 'active')
        .maybeSingle();
}

/** Soft-deletes a response by setting its `flagged_at` timestamp. */
export async function flagResponseApi(responseId: string): Promise<void> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('responses')
        .update({ flagged_at: new Date().toISOString() })
        .eq('id', responseId)
        .select();

    if (error) {
        console.error('Failed to flag response:', error);
        throw error;
    }
    if (!data || data.length === 0) {
        const msg = 'Flag had no effect — the responses table may be missing an UPDATE RLS policy. See supabase/migrations/soft_delete_responses.sql.';
        console.error(msg);
        throw new Error(msg);
    }
}

/** Restores a soft-deleted response by clearing its `flagged_at` timestamp. */
export async function unflagResponseApi(responseId: string): Promise<void> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('responses')
        .update({ flagged_at: null })
        .eq('id', responseId)
        .select();

    if (error) {
        console.error('Failed to unflag response:', error);
        throw error;
    }
    if (!data || data.length === 0) {
        const msg = 'Unflag had no effect — the responses table may be missing an UPDATE RLS policy. See supabase/migrations/soft_delete_responses.sql.';
        console.error(msg);
        throw new Error(msg);
    }
}

/** Fetches responses that have been flagged (soft-deleted) for a discussion. */
export async function fetchFlaggedResponsesApi(discussionId: string | null): Promise<Response[]> {
    if (!discussionId) return [];
    const supabase = createClient();
    const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('discussion_id', discussionId)
        .not('flagged_at', 'is', null)
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Response[];
}

export async function submitStudentResponseApi(discussionId: string, text: string, selectedOption: string | null = null, isCorrect: boolean | null = null) {
    const supabase = createClient();
    return supabase
        .from('responses')
        .insert([
            {
                discussion_id: discussionId,
                response_text: text,
                selected_option: selectedOption,
                is_correct: isCorrect,
            },
        ])
        .select()
        .single();
}
