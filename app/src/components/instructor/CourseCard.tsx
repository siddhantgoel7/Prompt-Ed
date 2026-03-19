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
}: {
  course: Course;
  onAccess: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl card-hover cursor-pointer group"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 2px 16px rgba(45,158,45,0.06), 0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top action menu */}
      <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="12" cy="19" r="1.5"/>
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
        style={{ background: 'linear-gradient(135deg, rgba(45,158,45,0.15), rgba(61,181,61,0.08))' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(45,158,45,0.18)' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        {/* Decorative corner orb */}
        <div
          className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-20"
          style={{ background: 'var(--color-primary-300)' }}
        />
      </div>

      {/* Content */}
      <div className="p-5" onClick={onAccess}>
        <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Created {formatDate(course.date_created)}
        </p>
        <h3
          className="text-base font-semibold mb-4 leading-snug line-clamp-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {course.title}
        </h3>

        <button
          onClick={onAccess}
          className="w-full py-2 rounded-[10px] text-sm font-semibold transition-all duration-150"
          style={{
            background: 'rgba(45,158,45,0.12)',
            color: 'var(--color-primary-600)',
            border: '1px solid rgba(45,158,45,0.2)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-500)';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(45,158,45,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary-600)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(45,158,45,0.2)';
          }}
        >
          Open Course
        </button>
      </div>
    </div>
  );
}
