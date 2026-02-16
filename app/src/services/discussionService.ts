import { createClient } from '@/lib/supabase/client';
import type { Discussion, CreateDiscussionInput } from '@/types/discussion';

export const discussionService = {
  async create(lessonId: string, input: CreateDiscussionInput): Promise<Discussion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('discussions')
      .insert([{ ...input, lesson_id: lessonId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async publish(discussionId: string): Promise<Discussion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('discussions')
      .update({
        status: 'active',
        published_at: new Date().toISOString()
      })
      .eq('id', discussionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async close(discussionId: string): Promise<Discussion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('discussions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', discussionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByLesson(lessonId: string): Promise<Discussion[]> {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('discussions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
