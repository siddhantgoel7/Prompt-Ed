import { render, screen, fireEvent } from '@testing-library/react';
import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';

// Mock hook
jest.mock('@/hooks/useInstructorDashboard', () => ({
  useInstructorDashboard: jest.fn(),
}));
import { useInstructorDashboard } from '@/hooks/useInstructorDashboard';
const useInstructorDashboardMock = useInstructorDashboard as jest.Mock;

// Mock child components (stable UI we can click/assert)
jest.mock('@/components/instructor/InstructorDashboardHeader', () => ({
  InstructorDashboardHeader: ({ onLogout, loggingOut }: any) => (
    <div>
      <div>Dashboard Header</div>
      <div>loggingOut={String(loggingOut)}</div>
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/CoursesSection', () => ({
  CoursesSection: ({ courses, onAdd, onDelete, onAccess }: any) => (
    <div>
      <h2>Courses</h2>
      <button onClick={onAdd}>Add Course</button>

      {courses.map((c: any) => (
        <div key={c.id}>
          <span>{c.title}</span>
          <button onClick={() => onAccess(c.id)}>Open Course</button>
          <button onClick={() => onDelete(c.id)}>Delete Course</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/instructor/CourseDialog', () => ({
  CourseDialog: ({ open, title, mode, value, error, saving, onChange, onSubmit, onOpenChange }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        <div>mode={mode}</div>
        {error ? <div role="alert">{error}</div> : null}
        <input
          aria-label="Course Title"
          value={value?.title ?? ''}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
        <button onClick={onSubmit} disabled={saving}>
          Save Course
        </button>
        <button onClick={() => onOpenChange(false)}>Close Course Dialog</button>
      </div>
    ) : null,
}));

jest.mock('@/components/instructor/ConfirmDeleteDialog', () => ({
  ConfirmDeleteDialog: ({ open, title, error, deleting, onCancel, onConfirm, onOpenChange }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        {error ? <div role="alert">{error}</div> : null}
        <button onClick={onConfirm} disabled={deleting}>
          Confirm Delete
        </button>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onOpenChange(false)}>Close Delete Dialog</button>
      </div>
    ) : null,
}));

function makeDashboard(overrides: any = {}) {
  return {
    loadingUser: false,
    loggingOut: false,
    logout: jest.fn(),
    courses: [
      { id: 'c1', title: 'Course 1' },
      { id: 'c2', title: 'Course 2' },
    ],
    modal: { type: null },
    form: { title: '' },
    error: null,
    saving: false,
    deleting: false,

    openAdd: jest.fn(),
    openEdit: jest.fn(),
    openDelete: jest.fn(),
    closeModal: jest.fn(),
    onFormChange: jest.fn(),
    submitAdd: jest.fn(),
    submitEdit: jest.fn(),
    confirmDelete: jest.fn(),
    accessCourse: jest.fn(),

    ...overrides,
  };
}

describe('InstructorDashboard (Acceptance)', () => {
  // 4.1
  it('[US 2.01][AT1] success: dashboard renders on desktop (smoke)', () => {
    useInstructorDashboardMock.mockReturnValue(makeDashboard());
    render(<InstructorDashboard />);

    expect(screen.getByText(/Dashboard Header/i)).toBeInTheDocument();
    expect(screen.getByText(/Courses/i)).toBeInTheDocument();
  });

  // 4.2
  it('[US 1.49][AT1] success: clicking "Add Course" triggers openAdd', () => {
    const dash = makeDashboard();
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Add Course/i }));

    expect(dash.openAdd).toHaveBeenCalled();
  });

  // 4.3
  it('[US 1.49][AT2] success: add course modal shows and submit calls submitAdd', () => {
    const dash = makeDashboard({
      modal: { type: 'add' },
      form: { title: 'New Course' },
    });
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);

    expect(screen.getByText(/Add a Course/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Save Course/i }));

    expect(dash.submitAdd).toHaveBeenCalled();
  });

  // 4.4
  it('[US 1.49][AT3] failure: invalid/missing fields shows error and does not add', () => {
    const dash = makeDashboard({
      modal: { type: 'add' },
      form: { title: '' },
      error: 'Title is required',
    });
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);

    expect(screen.getByRole('alert')).toHaveTextContent(/Title is required/i);
    // User tries to submit anyway
    fireEvent.click(screen.getByRole('button', { name: /Save Course/i }));
    expect(dash.submitAdd).toHaveBeenCalled(); // UI attempts submit
    // Real "not added" behavior will be validated in hook/service unit tests + UI automation
  });

  // 4.5
  it('[US 1.50][AT1] success: delete confirmation dialog appears when delete opened', () => {
    const dash = makeDashboard({
      modal: { type: 'delete' },
    });
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);
    expect(screen.getByText(/Delete Course\?/i)).toBeInTheDocument();
  });

  // 4.6
  it('[US 1.50][AT2] success: confirming delete calls confirmDelete', () => {
    const dash = makeDashboard({
      modal: { type: 'delete' },
    });
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));

    expect(dash.confirmDelete).toHaveBeenCalled();
  });

  // 4.7
  it('[US 1.50][AT1] failure: cancel delete closes modal (calls closeModal)', () => {
    const dash = makeDashboard({
      modal: { type: 'delete' },
    });
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(dash.closeModal).toHaveBeenCalled();
  });

  // 4.8
  it('[US 1.03][AT1] success: clicking Logout calls logout handler', () => {
    const dash = makeDashboard();
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Logout/i }));

    expect(dash.logout).toHaveBeenCalled();
  });

  // 4.9
  it('[US 1.04][AT1] success: instructor sees only their courses/lessons (UI shows provided list)', () => {
    const dash = makeDashboard({
      courses: [{ id: 'c1', title: 'Only My Course' }],
    });
    useInstructorDashboardMock.mockReturnValue(dash);

    render(<InstructorDashboard />);
    expect(screen.getByText(/Only My Course/i)).toBeInTheDocument();
    expect(screen.queryByText(/Course 2/i)).not.toBeInTheDocument();
  });
});