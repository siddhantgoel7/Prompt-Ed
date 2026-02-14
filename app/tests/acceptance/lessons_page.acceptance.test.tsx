import { render, screen, fireEvent } from '@testing-library/react';
import { LessonsPage } from '@/components/instructor/LessonsPage';

jest.mock('@/hooks/useLessonsPage', () => ({
  useLessonsPage: jest.fn(),
}));
import { useLessonsPage } from '@/hooks/useLessonsPage';
const useLessonsPageMock = useLessonsPage as jest.Mock;

// Mock children
jest.mock('@/components/instructor/LessonsPageHeader', () => ({
  LessonsPageHeader: ({ title, onBack }: any) => (
    <div>
      <h1>{title}</h1>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

jest.mock('@/components/instructor/LessonsGrid', () => ({
  LessonsGrid: ({ lessons, onCreate, onAccess, onDelete }: any) => (
    <div>
      <button onClick={onCreate}>Start a New Lesson</button>
      {lessons.map((l: any) => (
        <div key={l.id}>
          <span>{l.title}</span>
          <button onClick={() => onAccess(l.id)}>Open Lesson</button>
          <button onClick={() => onDelete(l)}>Delete lesson</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock('@/components/instructor/LessonCreateDialog', () => ({
  LessonCreateDialog: ({ open, title, value, error, saving, onChange, onSubmit, onOpenChange }: any) =>
    open ? (
      <div>
        <h3>{title}</h3>
        {error ? <div role="alert">{error}</div> : null}
        <input
          aria-label="Lesson Title"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <button onClick={onSubmit} disabled={saving}>
          Create Lesson
        </button>
        <button onClick={() => onOpenChange(false)}>Close Create Dialog</button>
      </div>
    ) : null,
}));

jest.mock('@/components/instructor/ConfirmDeleteLessonDialog', () => ({
  ConfirmDeleteLessonDialog: ({ open, error, deleting, onCancel, onConfirm, onOpenChange }: any) =>
    open ? (
      <div>
        <h3>Delete Lesson?</h3>
        {error ? <div role="alert">{error}</div> : null}
        <button onClick={onConfirm} disabled={deleting}>
          Confirm Delete Lesson
        </button>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={() => onOpenChange(false)}>Close Delete Dialog</button>
      </div>
    ) : null,
}));

function makeLessonsVM(overrides: any = {}) {
  return {
    loading: false,
    course: { id: 'c1', title: 'Course Title' },
    lessons: [{ id: 'l1', title: 'Lesson 1' }],
    modal: { type: null },
    form: { title: '' },
    error: null,
    saving: false,
    deleting: false,

    back: jest.fn(),
    openCreate: jest.fn(),
    accessLesson: jest.fn(),
    openDelete: jest.fn(),
    closeModal: jest.fn(),
    onChange: jest.fn(),
    submitCreate: jest.fn(),
    confirmDelete: jest.fn(),

    ...overrides,
  };
}

describe('LessonsPage (Acceptance)', () => {
  it('[US 2.01][AT1] success: lessons page renders on desktop (smoke)', () => {
    useLessonsPageMock.mockReturnValue(makeLessonsVM());
    render(<LessonsPage courseId="c1" />);

    expect(screen.getByText(/PMCOL Teaching Tool/i)).toBeInTheDocument();
    expect(screen.getByText(/Course Title/i)).toBeInTheDocument();
  });

  it('[US 1.05][AT1] success: clicking "Start a New Lesson" triggers openCreate', () => {
    const vm = makeLessonsVM();
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    fireEvent.click(screen.getByRole('button', { name: /Start a New Lesson/i }));

    expect(vm.openCreate).toHaveBeenCalled();
  });

  it('[US 1.05][AT2] success: create dialog open and submit calls submitCreate', () => {
    const vm = makeLessonsVM({
      modal: { type: 'create' },
      form: { title: 'My New Lesson' },
    });
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    expect(screen.getByRole('heading', { name: /Start a New Lesson/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Create Lesson/i }));
    expect(vm.submitCreate).toHaveBeenCalled();
  });

  it('[US 1.05][AT2] failure: invalid create shows error', () => {
    const vm = makeLessonsVM({
      modal: { type: 'create' },
      form: { title: '' },
      error: 'Lesson title is required',
    });
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Lesson title is required/i);
  });

  it('[US 1.08][AT1] success: delete flow opens dialog when modal.type=delete', () => {
    const vm = makeLessonsVM({
      modal: { type: 'delete' },
    });
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    expect(screen.getByText(/Delete Lesson\?/i)).toBeInTheDocument();
  });

  it('[US 1.08][AT2] success: confirming delete calls confirmDelete', () => {
    const vm = makeLessonsVM({
      modal: { type: 'delete' },
    });
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete Lesson/i }));

    expect(vm.confirmDelete).toHaveBeenCalled();
  });

  it('[US 1.08][AT4] failure: cancel delete calls closeModal', () => {
    const vm = makeLessonsVM({
      modal: { type: 'delete' },
    });
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    expect(vm.closeModal).toHaveBeenCalled();
  });

  it('[US 1.05][AT2] state: shows empty lessons message when lessons list is empty', () => {
    const vm = makeLessonsVM({ lessons: [] });
    useLessonsPageMock.mockReturnValue(vm);

    render(<LessonsPage courseId="c1" />);
    expect(
      screen.getByText(/No lessons yet\. Click "Start a New Lesson" to create your first lesson!/i)
    ).toBeInTheDocument();
  });

  it('[US 1.04][AT2] failure: course not found blocks access', () => {
    useLessonsPageMock.mockReturnValue(makeLessonsVM({ course: null }));

    render(<LessonsPage courseId="c-missing" />);
    expect(screen.getByText(/Course not found/i)).toBeInTheDocument();
  });
});
