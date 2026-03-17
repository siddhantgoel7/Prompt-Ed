// Header bar for an ended lesson session with Export, Activate, and Split View buttons.
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
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
  exporting?: boolean;
  activating?: boolean;
  onExportOverviewTxt?: () => void;
  onExportDiscussionsCsv?: () => void;
  onExportStatistics?: () => void;
  onActivate?: () => void;
  onSplitView: () => void;
}) {
  const context = React.useContext(SessionContext);
  const exporting = context ? context.exportingData : props.exporting!;
  const activating = context ? context.activatingLesson : props.activating!;
  const onExportOverviewTxt = context ? context.handleExportOverviewTxt : props.onExportOverviewTxt!;
  const onExportDiscussionsCsv = context ? context.handleExportDiscussionsCsv : props.onExportDiscussionsCsv!;
  const onExportStatistics = context ? context.handleExportStatistics : props.onExportStatistics!;
  const onActivate = context ? context.handleActivate : props.onActivate!;
  const title = context ? context.lesson.title : props.title!;
  const onSplitView = props.onSplitView;
  return (
    <header className="border-b border-gray-300 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={exporting} variant="default">
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

        <Button onClick={onActivate} disabled={activating} variant="secondary">
          {activating ? 'Activating...' : 'Activate'}
        </Button>

        <Button onClick={onSplitView} variant="outline">Split View</Button>
      </div>
    </header>
  );
}
