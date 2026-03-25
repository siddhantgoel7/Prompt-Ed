// Instructor session route — extracts lessonId and renders the instructor session management page.
import { SessionPage } from '@/components/instructor/SessionPage';

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{ lessonId: string }>;
}>) {
  const { lessonId } = await params;
  return <SessionPage lessonId={lessonId} />;
}
