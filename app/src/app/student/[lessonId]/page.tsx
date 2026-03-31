// Student session route — resolves lessonId from URL params and renders the student session page.
// src/app/student/[lessonId]/page.tsx
'use client';

import { use } from 'react';
import { StudentSessionPage } from '@/components/student/session/StudentSessionPage';

export default function StudentRoute({
  params,
}: Readonly<{
  params: Promise<{ lessonId: string }>;
}>) {
  const { lessonId } = use(params);
  return <StudentSessionPage lessonId={lessonId} />;
}
