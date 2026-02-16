import { DiscussionPage } from '@/components/instructor/DiscussionPage';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface PageParams {
  lessonId: string;
  discussionId: string;
}

export default async function InstructorDiscussionPage({
  params
}: {
  params: Promise<PageParams>
}) {
  const { lessonId, discussionId } = await params;
  const supabase = await createClient();

  const [discussionResult, responsesResult] = await Promise.all([
    // A. Fetch Discussion Details
    supabase
      .from('discussions')
      .select('*')
      .eq('id', discussionId)
      .single(),

    // B. Fetch Existing Responses (Newest First)
    supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: false })
  ]);

  if (discussionResult.error || !discussionResult.data) {
    notFound();
  }

  const isActive = discussionResult.data.status === 'active';

  return (
    <DiscussionPage 
      lessonId={lessonId}
      discussionId={discussionId}
      initialDiscussion={discussionResult.data}
      initialResponses={responsesResult.data || []}
      initialIsActive={isActive}
    />
  )
}