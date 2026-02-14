import { LessonsPage } from '@/components/instructor/LessonsPage';

export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <LessonsPage courseId={courseId} />;
}
