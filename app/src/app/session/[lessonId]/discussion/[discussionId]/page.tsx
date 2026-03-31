// Server-side page that fetches discussion details and responses, then passes them
// as initial props to the DiscussionPage client component.
import { DiscussionPage } from '@/components/instructor/DiscussionPage';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface PageParams {
  lessonId: string;
  discussionId: string;
}

/** Fetches discussion and response data server-side, then renders the client DiscussionPage component. */
export default async function InstructorDiscussionPage({
  params
}: Readonly<{
  params: Promise<PageParams>
}>) {
  const { lessonId, discussionId } = await params;
  const supabase = await createClient();

  const [discussionResult, responsesResult, flaggedResult, lessonResult, countResult] = await Promise.all([
    // A. Fetch Discussion Details
    supabase
      .from('discussions')
      .select('*')
      .eq('id', discussionId)
      .single(),

    // B. Fetch Existing Responses (Newest First, excluding flagged)
    supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .is('flagged_at', null)
      .order('created_at', { ascending: false }),

    // C. Fetch Flagged Responses (for restore capability)
    supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .not('flagged_at', 'is', null)
      .order('created_at', { ascending: false }),

    // D. Fetch Lesson Status
    supabase
      .from('lessons')
      .select('status')
      .eq('id', lessonId)
      .single(),

    // E. Fetch Discussion Count
    supabase
      .from('discussions')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', lessonId)
  ]);

  if (discussionResult.error || !discussionResult.data || lessonResult.error) {
    notFound();
  }

  const isActive = discussionResult.data.status === 'active';
  const lessonStatus = lessonResult.data.status;
  const discussionCount = countResult.count ?? 0;

  return (
    <DiscussionPage
      lessonId={lessonId}
      discussionId={discussionId}
      initialDiscussion={discussionResult.data}
      initialResponses={responsesResult.data || []}
      initialFlaggedResponses={flaggedResult.data || []}
      initialIsActive={isActive}
      lessonStatus={lessonStatus}
      discussionCount={discussionCount}
    />
  )
}