// Card component for a single lesson in the lessons grid; also renders the "create new lesson" variant.
'use client';

import * as React from 'react';
import type { Lesson } from '@/types/lesson';

function formatDate(dateIso?: string) {
  if (!dateIso) return '';
  return new Date(dateIso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

type StatusConfig = { label: string; bg: string; text: string };

/** Maps a lesson status string to a badge style. */
function statusToBadge(status?: string): StatusConfig {
  switch (status) {
    case 'active':
      return { label: 'Active', bg: 'var(--color-primary-alpha-15)', text: 'var(--color-primary-600)' };
    case 'ended':
      return { label: 'Ended', bg: 'var(--color-error-alpha-12)', text: 'var(--color-error-600)' };
    case 'draft':
      return { label: 'Draft', bg: 'var(--color-warning-alpha-12)', text: 'var(--color-warning-600)' };
    default:
      return { label: 'Unknown', bg: 'var(--surface-raised)', text: 'var(--text-muted)' };
  }
}

type LessonMeta = { status?: string; date_created?: string };
type LessonWithMeta = Lesson & LessonMeta;

/**
 * Polymorphic card component — renders either a "Start a New Lesson" button card
 * (kind: 'create') or a lesson info card with access and delete actions (kind: 'lesson').
 */
export function LessonCard(
  props: Readonly<
    | { kind: 'create'; onCreate: () => void }
    | { kind: 'lesson'; lesson: Lesson; onAccess: () => void; onDelete: () => void }
  >
) {
  if (props.kind === 'create') {
    return (
      <button
        onClick={props.onCreate}
        className="h-28 w-full rounded-2xl flex items-center justify-center gap-3 group transition-all duration-150 card-hover"
        style={{
          background: 'var(--surface-glass)',
          border: '1.5px dashed var(--border-default)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150"
          style={{ background: 'var(--color-primary-alpha-12)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-content-secondary">
          New Lesson
        </span>
      </button>
    );
  }

  const lesson = props.lesson as LessonWithMeta;
  const badge = statusToBadge(lesson.status);

  return (
    <div
      className="h-28 rounded-2xl relative p-4 flex flex-col justify-between card-hover group w-full text-left"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 2px 12px var(--color-black-alpha-06)',
      }}
    >
      {/* Top row: Status Badge and Delete Action */}
      <div className="flex items-center justify-between relative z-20">
        <span
          className="text-xs font-medium px-2.5 py-0.5 rounded-full"
          style={{ background: badge.bg, color: badge.text }}
        >
          {badge.label}
        </span>

        <button
          type="button"
          title="Delete lesson"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete();
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 text-content-muted"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-error-alpha-10)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-error-600)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {/* Main card content with stretched link */}
      <div className="relative">
        <button
          type="button"
          onClick={props.onAccess}
          className="absolute inset-0 z-10 opacity-0 cursor-pointer w-full h-full focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-2xl"
          aria-label={`Open lesson: ${lesson.title}`}
        />
        <h3 className="text-sm font-semibold leading-snug line-clamp-1 mb-0.5 text-content-primary relative z-0">
          {lesson.title}
        </h3>
        <p className="text-xs text-content-muted relative z-0">
          {formatDate(lesson.date_created)}
        </p>
      </div>
    </div>
  );
}
