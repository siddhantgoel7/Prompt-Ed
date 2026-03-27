// Server-side page for the interactive word cloud.
//
// Security model (server-rendered, no client-side auth bypass possible):
//  1. Auth check   — unauthenticated users are redirected to home.
//  2. Ownership    — the logged-in user must be the instructor who owns the lesson's course.
//                    Joining courses!inner ensures the row only exists if the FK matches.
//  3. Scope guard  — the discussion must belong to the given lessonId (prevents cross-lesson access).
//
// Data fetched here is passed as props to WordCloudPageClient, which handles all
// interactivity (word clicks, spotlight overlay) and subscribes for real-time updates.

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WordCloudPageClient } from '@/components/instructor/session/WordCloudPageClient';

interface PageParams {
  lessonId: string;
  discussionId: string;
}

export default async function WordCloudPage({
  params,
}: Readonly<{
  params: Promise<PageParams>;
}>) {
  const { lessonId, discussionId } = await params;
  const supabase = await createClient();

  // ── Auth check ──────────────────────────────────────────────────────────────
  // getUser() hits the Supabase Auth server — safe to use server-side.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // ── Ownership check ─────────────────────────────────────────────────────────
  // courses!inner means the join fails (returns no row) if the lesson has no parent course,
  // so !lessonData also covers the case where the lesson doesn't exist at all.
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('id, courses!inner(instructor_id)')
    .eq('id', lessonId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!lessonData || (lessonData as any).courses?.instructor_id !== user.id) {
    redirect('/');
  }

  // ── Fetch discussion + responses ─────────────────────────────────────────────
  // Both queries run in parallel to minimise server latency.
  // The .eq('lesson_id', lessonId) on discussions is a scope guard — it prevents
  // a crafted URL from loading a discussion that belongs to a different lesson
  // that the user may not own.
  const [discussionResult, responsesResult] = await Promise.all([
    supabase
      .from('discussions')
      .select('*')
      .eq('id', discussionId)
      .eq('lesson_id', lessonId)   // guard: discussion must belong to this lesson
      .single(),
    supabase
      .from('responses')
      .select('*')
      .eq('discussion_id', discussionId)
      .is('flagged_at', null)      // exclude flagged (hidden) responses
      .order('created_at', { ascending: false }),
  ]);

  if (discussionResult.error || !discussionResult.data) {
    notFound();
  }

  return (
    <WordCloudPageClient
      discussion={discussionResult.data}
      responses={responsesResult.data ?? []}
    />
  );
}
