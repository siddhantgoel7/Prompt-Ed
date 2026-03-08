// Dynamic route for a course's lessons page, extracts courseId from URL params.
import { LessonsPage } from '@/components/instructor/LessonsPage';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <LessonsPage courseId={courseId} />;
}
