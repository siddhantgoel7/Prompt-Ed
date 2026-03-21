// Lessons page component for a specific course — lists existing lessons and handles
// create/delete actions via dialogs, driven by the useLessonsPage hook.
'use client';

import * as React from 'react';

import { useLessonsPage } from '@/hooks/useLessonsPage';
import { LessonsPageHeader } from './LessonsPageHeader';
import { LessonsGrid } from './LessonsGrid';
import { LessonCreateDialog } from './LessonCreateDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

/** Renders the lessons page for a course, with loading/not-found states and lesson management dialogs. */
export function LessonsPage({ courseId }: { courseId: string }) {
  const page = useLessonsPage(courseId);

  if (page.loading) {
    return <LoadingScreen />;
  }

  if (!page.course) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-surface-base"
      >
        <p className="text-content-muted">Course not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <LessonsPageHeader title="PromptED" onBack={page.back} />

      <main className="mx-auto w-full max-w-6xl px-4 md:px-6 py-10">
        <div className="mb-8">
          <h2
            className="text-2xl md:text-3xl font-bold tracking-tight text-content-primary"
          >
            {page.course.title}
          </h2>
          <p className="text-sm mt-1 text-content-muted">
            {page.lessons.length === 0
              ? 'No lessons yet — create your first'
              : `${page.lessons.length} lesson${page.lessons.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <LessonsGrid
          lessons={page.lessons}
          onCreate={page.openCreate}
          onAccess={page.accessLesson}
          onDelete={page.openDelete}
        />
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
