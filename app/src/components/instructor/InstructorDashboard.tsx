// Root instructor dashboard component — composes the header, courses section,
// and add/edit/delete dialogs, all driven by the useInstructorDashboard hook.
'use client';

import { InstructorDashboardHeader } from './InstructorDashboardHeader';
import { CoursesSection } from './CoursesSection';
import { CourseDialog } from './CourseDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useInstructorDashboard } from '@/hooks/useInstructorDashboard';

/** Renders the full instructor dashboard page with course management and modals. */
export function InstructorDashboard() {
  const dashboard = useInstructorDashboard();

  if (dashboard.loadingUser) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <InstructorDashboardHeader loggingOut={dashboard.loggingOut} onLogout={dashboard.logout} />

      <main className="px-4 py-10 md:px-8 md:py-12">
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
        description="Are you sure you want to delete this course? This will also delete all lessons associated with this course. This action cannot be undone."
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
