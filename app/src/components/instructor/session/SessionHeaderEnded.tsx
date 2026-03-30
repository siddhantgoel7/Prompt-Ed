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
export function SessionHeaderEnded(props: Readonly<{
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
}>) {
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
      className="glass sticky top-0 z-50 px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0"
    >
      <h1 className="text-xl font-semibold text-content-primary truncate max-w-full sm:max-w-[40%] text-center sm:text-left">
        {title}
      </h1>

      <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
        <Button onClick={onBackToLessons} disabled={!onBackToLessons} variant="outline" className="text-xs h-8 px-2 sm:px-3">
          <span className="hidden xs:inline">Back to Lessons</span>
          <span className="xs:hidden">Back</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={exporting} variant="default" className="text-xs h-8 px-2 sm:px-3">
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 sm:w-72">
            <DropdownMenuItem onClick={onExportOverviewTxt} className="items-start py-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Export overview TXT</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                  Full lesson summary, transcripts, and files
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDiscussionsCsv} className="items-start py-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Export Discussions CSV</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                  Spreadsheet of prompts and responses
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportStatistics} className="items-start py-2">
              <div className="flex flex-col">
                <span className="font-medium text-sm">Export Statistics</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                  Engagement metrics, rates, and timestamps
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onActivate} disabled={activating} variant="secondary" className="text-xs h-8 px-2 sm:px-3">
          {activating ? '...' : <span className="hidden xs:inline">Activate</span>}
          {!activating && <span className="xs:hidden">Restart</span>}
        </Button>

        <Button onClick={onSplitView} variant="outline" className="text-xs h-8 px-2 sm:px-3">
          <span className="hidden xs:inline">Split View</span>
          <span className="xs:hidden">Grid</span>
        </Button>
      </div>
    </header>
  );
}
