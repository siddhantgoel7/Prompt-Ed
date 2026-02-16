'use client';

import type { Lesson } from '@/types/lesson';
import { LessonCard } from './LessonCard';

export function LessonsGrid({
  lessons,
  onCreate,
  onAccess,
  onDelete,
}: {
  lessons: Lesson[];
  onCreate: () => void;
  onAccess: (lessonId: string) => void;
  onDelete: (lesson: Lesson) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <LessonCard kind="create" onCreate={onCreate} />

      {lessons.map((lesson) => (
        <LessonCard
          key={lesson.id}
          kind="lesson"
          lesson={lesson}
          onAccess={() => onAccess(lesson.id)}
          onDelete={() => onDelete(lesson)}
        />
      ))}
    </div>
  );
}
