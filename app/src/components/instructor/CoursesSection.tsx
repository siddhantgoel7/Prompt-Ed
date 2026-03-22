// Section component that displays the instructor's course grid with an "Add a course" button.
'use client';

import * as React from 'react';
import type { Course } from '@/types/course';
import { CourseCard } from '@/components/instructor/CourseCard';

/** Renders the courses section heading, add button, and a responsive grid of CourseCard items. */
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
    <section className="mx-auto w-full max-w-6xl px-2 md:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold tracking-tight text-content-primary"
          >
            Your Courses
          </h2>
          <p className="text-sm mt-1 text-content-muted">
            {courses.length === 0
              ? 'Get started by adding your first course'
              : `${courses.length} course${courses.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white transition-all duration-150 btn-primary-glow"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
          }}
        >
          <span>+</span>
          <span>Add Course</span>
        </button>
      </div>

      {courses.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center enter"
          style={{
            background: 'var(--surface-glass)',
            backdropFilter: 'blur(12px)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(45,158,45,0.12)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <p className="font-semibold mb-1 text-content-primary">No courses yet</p>
          <p className="text-sm text-content-muted">
            Click &ldquo;Add Course&rdquo; to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger">
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
