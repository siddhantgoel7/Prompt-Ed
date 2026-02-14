'use client';

import * as React from 'react';
import type { Course } from '@/types/course';

import { Button } from '@/components/ui/button';
import { CourseCard } from '@/components/instructor/CourseCard';

export function CoursesSection({
  courses,
  onAdd,
  onAccess,
  onEdit,
  onDelete,
}: {
  courses: Course[];
  onAdd: () => void;
  onAccess: (courseId: string) => void;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Your Courses!</h2>
        <Button onClick={onAdd}>Add a course</Button>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
          No courses yet. Click &quot;Add a course&quot; to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onAccess={() => onAccess(course.id)}
              onEdit={() => onEdit(course)}
              onDelete={() => onDelete(course.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
