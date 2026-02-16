import { createClient } from '@/lib/supabase/client';
import type { Response, CreateResponseInput } from '@/types/response';

export const responseService = {
  async submit(input: CreateResponseInput): Promise<Response> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('responses')
      .insert([{
        ...input,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByDiscussion(discussionId: string): Promise<Response[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
