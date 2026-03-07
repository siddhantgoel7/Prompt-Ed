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

export async function fetchResponsesApi(discussionId: string | null): Promise<Response[]> {
    if (!discussionId) return [];
    const supabase = createClient();
    const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Response[];
}
