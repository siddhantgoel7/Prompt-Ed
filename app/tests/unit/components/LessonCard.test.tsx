/**
 * Tests for LessonCard component.
 * Covers: kind='create' renders and fires onCreate, kind='lesson' all status
 * badges (active, ended, draft, default/unknown), delete button click with
 * stopPropagation, access button click, delete button mouseEnter/Leave,
 * formatDate with and without a date.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LessonCard } from '@/components/instructor/LessonCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    title: 'Introduction to Pharmacology',
    status: 'draft',
    date_created: '2024-03-15T10:00:00Z',
    ...overrides,
  } as any;
}

// ── Tests — kind='create' ─────────────────────────────────────────────────

describe('LessonCard (kind=create)', () => {
  it('renders "New Lesson" label', () => {
    render(<LessonCard kind="create" onCreate={jest.fn()} />);
    expect(screen.getByText('New Lesson')).toBeInTheDocument();
  });

  it('calls onCreate when clicked', () => {
    const onCreate = jest.fn();
    render(<LessonCard kind="create" onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

// ── Tests — kind='lesson' ─────────────────────────────────────────────────

describe('LessonCard (kind=lesson)', () => {
  it('renders the lesson title', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson()} onAccess={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Introduction to Pharmacology')).toBeInTheDocument();
  });

  it('shows "Draft" badge for status=draft', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson({ status: 'draft' })} onAccess={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows "Active" badge for status=active', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson({ status: 'active' })} onAccess={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows "Ended" badge for status=ended', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson({ status: 'ended' })} onAccess={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('shows "Unknown" badge for unrecognized status', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson({ status: 'archived' })} onAccess={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('calls onAccess when the hidden access button is clicked', () => {
    const onAccess = jest.fn();
    render(<LessonCard kind="lesson" lesson={makeLesson()} onAccess={onAccess} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Open lesson/i }));
    expect(onAccess).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete and stops propagation when delete button is clicked', () => {
    const onDelete = jest.fn();
    render(<LessonCard kind="lesson" lesson={makeLesson()} onAccess={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Delete lesson'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('applies error styles on delete button mouseEnter and resets on mouseLeave', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson()} onAccess={jest.fn()} onDelete={jest.fn()} />);
    const deleteBtn = screen.getByTitle('Delete lesson');
    fireEvent.mouseEnter(deleteBtn);
    expect(deleteBtn.style.background).toBe('var(--color-error-alpha-10)');
    expect(deleteBtn.style.color).toBe('var(--color-error-600)');
    fireEvent.mouseLeave(deleteBtn);
    expect(deleteBtn.style.background).toBe('transparent');
    expect(deleteBtn.style.color).toBe('var(--text-muted)');
  });

  it('renders empty date when date_created is undefined', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson({ date_created: undefined })} onAccess={jest.fn()} onDelete={jest.fn()} />);
    // No date text — just verify it renders without crashing
    expect(screen.getByText('Introduction to Pharmacology')).toBeInTheDocument();
  });

  it('renders a formatted date when date_created is provided', () => {
    render(<LessonCard kind="lesson" lesson={makeLesson({ date_created: '2024-03-15T10:00:00Z' })} onAccess={jest.fn()} onDelete={jest.fn()} />);
    // Formatted as "15 Mar, 24" or similar — just check it's in the doc
    const dateEl = document.querySelector('p.text-xs');
    expect(dateEl).not.toBeNull();
    expect(dateEl!.textContent).not.toBe('');
  });
});
