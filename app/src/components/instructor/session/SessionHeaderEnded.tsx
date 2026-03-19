// Header bar for an ended lesson session with Export, Activate, and Split View buttons.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onExportOverviewTxt?: () => void;
  onExportDiscussionsCsv?: () => void;
  onExportStatistics?: () => void;
  onActivate?: () => void;
  onBackToLessons?: () => void;
  onSplitView: () => void;
}) {
  const router = useRouter();
  const context = React.useContext(SessionContext);
  const exporting = context ? context.exportingData : props.exporting!;
  const activating = context ? context.activatingLesson : props.activating!;
  const onExportOverviewTxt = context ? context.handleExportOverviewTxt : props.onExportOverviewTxt!;
  const onExportDiscussionsCsv = context ? context.handleExportDiscussionsCsv : props.onExportDiscussionsCsv!;
  const onExportStatistics = context ? context.handleExportStatistics : props.onExportStatistics!;
  const onActivate = context ? context.handleActivate : props.onActivate!;
  const title = context ? context.lesson.title : props.title!;
  const courseId = context ? context.lesson.course_id : props.courseId;
  const onSplitView = props.onSplitView;
  const onBackToLessons = props.onBackToLessons
    ?? (courseId ? () => router.push(`/lessons_page/${courseId}`) : undefined);

  return (
    <header
      className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>

      <div className="flex items-center gap-3">
        <Button onClick={onBackToLessons} disabled={!onBackToLessons} variant="outline" className="text-xs h-8">
          Back to Lessons
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={exporting} variant="default" className="text-xs h-8">
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem onClick={onExportOverviewTxt} className="items-start py-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Export overview TXT</span>
                <span className="text-xs text-muted-foreground">
                  Full lesson summary, transcripts, and files
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDiscussionsCsv} className="items-start py-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Export Discussions CSV</span>
                <span className="text-xs text-muted-foreground">
                  Spreadsheet of prompts and responses
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportStatistics} className="items-start py-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Export Statistics</span>
                <span className="text-xs text-muted-foreground">
                  Engagement metrics, participation rates, and timestamps
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onActivate} disabled={activating} variant="secondary" className="text-xs h-8">
          {activating ? 'Activating...' : 'Activate'}
        </Button>

        <Button onClick={onSplitView} variant="outline" className="text-xs h-8">Split View</Button>
      </div>
    </header>
  );
}
