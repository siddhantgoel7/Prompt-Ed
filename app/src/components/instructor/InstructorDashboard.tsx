'use client';

import { Skeleton } from '@/components/ui/skeleton';

import { InstructorDashboardHeader } from './InstructorDashboardHeader';
import { CoursesSection } from './CoursesSection';
import { CourseDialog } from './CourseDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

import { useInstructorDashboard } from '@/hooks/useInstructorDashboard';

export function InstructorDashboard() {
  const dashboard = useInstructorDashboard();

  if (dashboard.loadingUser) {
    // Keep the literal "Loading..." for tests or update tests later
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 px-6">
          <p className="text-gray-500">Loading...</p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <InstructorDashboardHeader loggingOut={dashboard.loggingOut} onLogout={dashboard.logout} />

      <main className="px-8 py-12">
        <CoursesSection
          courses={dashboard.courses}
          onAdd={dashboard.openAdd}
          onAccess={dashboard.accessCourse}
          onEdit={dashboard.openEdit}
          onDelete={(courseId) => {
            const course = dashboard.courses.find((c) => c.id === courseId);
            if (course) {
              dashboard.openDelete(course);
            }
          }}
        />
      </main>

      <CourseDialog
        open={dashboard.modal.type === 'add' || dashboard.modal.type === 'edit'}
        title={dashboard.modal.type === 'add' ? 'Add a Course' : 'Edit Course'}
        mode={dashboard.modal.type === 'add' ? 'add' : 'edit'}
        value={dashboard.form}
        error={dashboard.error}
        saving={dashboard.saving}
        onOpenChange={(open) => {
          if (!open) dashboard.closeModal();
        }}
        onChange={dashboard.onFormChange}
        onSubmit={dashboard.modal.type === 'add' ? dashboard.submitAdd : dashboard.submitEdit}
      />

      <ConfirmDeleteDialog
        open={dashboard.modal.type === 'delete'}
        title="Delete Course?"
        error={dashboard.error}
        deleting={dashboard.deleting}
        onOpenChange={(open) => {
          if (!open) dashboard.closeModal();
        }}
        onCancel={dashboard.closeModal}
        onConfirm={dashboard.confirmDelete}
      />
    </div>
  );
}
