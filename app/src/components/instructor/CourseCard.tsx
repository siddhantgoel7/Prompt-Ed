// Card component that displays a single course with access, edit, and delete actions.
'use client';

import * as React from 'react';
import type { Course } from '@/types/course';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Formats an ISO date string to a locale date string for display. */
function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Displays a course card with title, creation date, and action buttons (access, edit, delete). */
export function CourseCard({
  course,
  onAccess,
  onEdit,
  onDelete,
}: Readonly<{
  course: Course;
  onAccess: () => void;
  onEdit: () => void;
  onDelete: () => void;
}>) {
  return (
    <div
      className="glass relative overflow-hidden rounded-2xl card-hover group w-full text-left p-0 block"
      style={{
        boxShadow: '0 2px 16px var(--color-primary-alpha-06), 0 1px 3px var(--color-black-alpha-06)',
      }}
    >
      {/* Top action menu */}
      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 bg-surface-raised text-content-secondary hover:bg-surface-raised/80"
              style={{
                border: '1px solid var(--border-default)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Course actions</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Course thumbnail area */}
      <div
        className="h-36 flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-primary-alpha-15), var(--color-primary-400-alpha-08))' }}
      >
        {course.image_url ? (
          <img
            src={course.image_url}
            alt={`${course.title} thumbnail`}
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="course-card-image"
          />
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--color-primary-alpha-18)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div
              className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-20"
              style={{ background: 'var(--color-primary-300)' }}
            />
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-xs mb-1.5 text-content-muted">
          Created {formatDate(course.date_created)}
        </p>
        <h3
          className="text-base font-semibold mb-4 leading-snug line-clamp-2 text-content-primary"
        >
          {course.title}
        </h3>

        <button
          type="button"
          onClick={onAccess}
          className="relative z-10 w-full py-2 rounded-[10px] text-sm font-semibold transition-all duration-150 after:absolute after:inset-0 after:z-0 after:cursor-pointer"
          style={{
            background: 'var(--color-primary-alpha-12)',
            color: 'var(--color-primary-600)',
            border: '1px solid var(--color-primary-alpha-20)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-500)';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-alpha-12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-600)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary-alpha-20)';
          }}
        >
          Open Course
        </button>
      </div>
    </div>
  );
}
