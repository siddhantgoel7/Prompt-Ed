// Header bar for an ended lesson session with Export, Activate, and Split View buttons.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

import { SessionContext } from './SessionContext';

/**
 * Ended-session header with lesson title and Export Txt / Activate / Split View buttons.
 * Reads from SessionContext when available, falling back to explicit props for testing.
 */
export function SessionHeaderEnded(props: {
  title?: string;
  courseId?: string;
  exporting?: boolean;
  activating?: boolean;
  onExport?: () => void;
  onActivate?: () => void;
  onBackToLessons?: () => void;
  onSplitView: () => void;
}) {
  const router = useRouter();
  const context = React.useContext(SessionContext);
  const exporting = context ? context.exportingData : props.exporting!;
  const activating = context ? context.activatingLesson : props.activating!;
  const onExport = context ? context.handleExportLessonData : props.onExport!;
  const onActivate = context ? context.handleActivate : props.onActivate!;
  const title = context ? context.lesson.title : props.title!;
  const courseId = context ? context.lesson.course_id : props.courseId;
  const onSplitView = props.onSplitView;
  const onBackToLessons = props.onBackToLessons
    ?? (courseId ? () => router.push(`/lessons_page/${courseId}`) : undefined);

  return (
    <header className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        <Button onClick={onBackToLessons} disabled={!onBackToLessons} variant="outline">
          Back to Lessons
        </Button>

        <Button onClick={onExport} disabled={exporting} variant="default">
          {exporting ? 'Exporting...' : 'Export Txt'}
        </Button>

        <Button onClick={onActivate} disabled={activating} variant="secondary">
          {activating ? 'Activating...' : 'Activate'}
        </Button>

        <Button onClick={onSplitView} variant="outline">Split View</Button>
      </div>
    </header>
  );
}
