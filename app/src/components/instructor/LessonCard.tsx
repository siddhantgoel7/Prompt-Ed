// Card component for a single lesson in the lessons grid; also renders the "create new lesson" variant.
'use client';

import * as React from 'react';
import type { Lesson } from '@/types/lesson';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function formatDate(dateIso?: string) {
  if (!dateIso) return '';
  return new Date(dateIso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/** Maps a lesson status string to a badge label and CSS class. */
function statusToBadge(status?: string) {
  switch (status) {
    case 'active':
      return { label: 'Active', className: 'bg-green-100 text-green-800 hover:bg-green-100' };
    case 'ended':
      return { label: 'Ended', className: 'bg-red-200 text-red-700 hover:bg-red-200' };
    case 'draft':
      return { label: 'Draft', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' };
    default:
      return { label: 'Unknown', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' };
  }
}

//  Lesson type likely doesn’t include these fields, but  DB rows do.
type LessonMeta = {
  status?: string;
  date_created?: string;
};

type LessonWithMeta = Lesson & LessonMeta;

/**
 * Polymorphic card component — renders either a "Start a New Lesson" button card
 * (kind: 'create') or a lesson info card with access and delete actions (kind: 'lesson').
 */
export function LessonCard(
  props:
    | { kind: 'create'; onCreate: () => void }
    | { kind: 'lesson'; lesson: Lesson; onAccess: () => void; onDelete: () => void }
) {
  if (props.kind === 'create') {
    return (
      <Card
        onClick={props.onCreate}
        className="cursor-pointer h-32 border-dashed flex items-center justify-center hover:shadow-md transition-shadow"
      >
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <span className="text-lg">+</span>
          </div>
          <h3 className="text-base font-semibold">Start a New Lesson</h3>
        </div>
      </Card>
    );
  }

  const lesson = props.lesson as LessonWithMeta;
  const badge = statusToBadge(lesson.status);

  return (
    <Card
      onClick={props.onAccess}
      className="cursor-pointer h-32 relative p-4 flex flex-col justify-center hover:shadow-md transition-shadow"
    >
      <div className="absolute left-3 top-3">
        <Badge className={badge.className}>{badge.label}</Badge>
      </div>

      <button
        title="Delete lesson"
        onClick={(e) => {
          e.stopPropagation();
          props.onDelete();
        }}
        className="absolute top-2 right-2 rounded-md p-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
      >
        🗑️
      </button>

      <h3 className="text-lg font-bold mb-1 mt-5">{lesson.title}</h3>
      <p className="text-xs text-gray-500">Date: {formatDate(lesson.date_created)}</p>
    </Card>
  );
}
