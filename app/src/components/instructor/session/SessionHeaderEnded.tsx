// Header bar for an ended lesson session with Export, Activate, and Split View buttons.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

import { SessionContext } from './SessionContext';

/**
 * Ended-session header with lesson title and Export Txt / Activate / Split View buttons.
 * Reads from SessionContext when available, falling back to explicit props for testing.
 */
export function SessionHeaderEnded(props: {
  title?: string;
  exporting?: boolean;
  activating?: boolean;
  onExport?: () => void;
  onActivate?: () => void;
  onSplitView: () => void;
}) {
  const context = React.useContext(SessionContext);
  const exporting = context ? context.exportingData : props.exporting!;
  const activating = context ? context.activatingLesson : props.activating!;
  const onExport = context ? context.handleExportLessonData : props.onExport!;
  const onActivate = context ? context.handleActivate : props.onActivate!;
  const title = context ? context.lesson.title : props.title!;
  const onSplitView = props.onSplitView;
  return (
    <header className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
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
