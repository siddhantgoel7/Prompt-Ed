// Lessons page component for a specific course — lists existing lessons and handles
// create/delete actions via dialogs, driven by the useLessonsPage hook.
'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

import { useLessonsPage } from '@/hooks/useLessonsPage';
import { LessonsPageHeader } from './LessonsPageHeader';
import { LessonsGrid } from './LessonsGrid';
import { LessonCreateDialog } from './LessonCreateDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

/** Renders the lessons page for a course, with loading/not-found states and lesson management dialogs. */
export function LessonsPage({ courseId }: { courseId: string }) {
  const page = useLessonsPage(courseId);

  if (page.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 px-6">
          <p className="text-gray-500">Loading...</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!page.course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LessonsPageHeader title="PMCOL Teaching Tool" onBack={page.back} />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="text-3xl font-bold tracking-tight mb-8">{page.course.title}</h2>

        <LessonsGrid
          lessons={page.lessons}
          onCreate={page.openCreate}
          onAccess={page.accessLesson}
          onDelete={page.openDelete}
        />

        {page.lessons.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No lessons yet. Click &quot;Start a New Lesson&quot; to create your first lesson!
          </div>
        )}
      </main>

      <LessonCreateDialog
        open={page.modal.type === 'create'}
        onOpenChange={(open) => {
          if (!open) page.closeModal();
        }}
        title="Start a New Lesson"
        value={page.form.title}
        onChange={page.onChange}
        onSubmit={page.submitCreate}
        error={page.error}
        saving={page.saving}
      />

      <ConfirmDeleteDialog
        open={page.modal.type === 'delete'}
        onOpenChange={(open) => {
          if (!open) page.closeModal();
        }}
        title="Delete Lesson?"
        description="Are you sure you want to delete this lesson? This action cannot be undone."
        deleting={page.deleting}
        error={page.error}
        onCancel={page.closeModal}
        onConfirm={page.confirmDelete}
      />
    </div>
  );
}
