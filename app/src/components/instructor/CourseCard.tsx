// Card component that displays a single course with access, edit, and delete actions.
'use client';

import * as React from 'react';
import type { Course } from '@/types/course';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Formats an ISO date string to a locale date string for display. */
function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString();
}

/** Displays a course thumbnail, creation date, title, and action buttons (access, edit, delete). */
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
    <Card className="overflow-hidden border border-gray-200 relative">
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-gray-300 h-48 flex items-center justify-center">
        <div className="bg-white p-4 rounded">
          <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-500 mb-2">Date Created: {formatDate(course.date_created)}</p>
        <h3 className="text-xl font-semibold mb-4">{course.title}</h3>

        <Button className="w-full" onClick={onAccess}>
          Access
        </Button>
      </div>
    </Card>
  );
}
