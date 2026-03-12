'use client';

// Right panel of the active session view: live student responses and MC answer distribution.

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { DiscussionAnalyticsModal } from './DiscussionAnalyticsModal';

/** Displays live student responses and, for MC questions, per-option response counts.
 *  Also shows a "View Analytics" button that opens the DiscussionAnalyticsModal. */
export function ActiveRightPanel(props: {
  responses?: Response[];
  activeDiscussion?: Discussion | null;
  studentCount?: number;
}) {
  const context = React.useContext(SessionContext);
  const responses = context ? context.responses : props.responses!;
  const activeDiscussion = context ? context.activeDiscussion : props.activeDiscussion!;
  const studentCount = context ? context.studentCount : (props.studentCount ?? 0);
  // Peak student count seen during the current discussion — only goes up, never down
  const peakStudentCount = context ? context.peakStudentCount : studentCount;

  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);

  const isMC = activeDiscussion?.prompt_type === 'multiple_choice';

  const distribution: Record<string, number> = {};
  if (isMC && activeDiscussion?.mc_options) {
    activeDiscussion.mc_options.forEach(opt => {
      distribution[opt.label] = 0;
    });
    responses.forEach(r => {
      if (r.selected_option && distribution[r.selected_option] !== undefined) {
        distribution[r.selected_option]++;
      }
    });
  }

  return (
    <aside className="w-80 max-md:w-full border-l border-gray-300 p-4 md:p-6 flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Live Responses</div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>{responses.length}</span>
            {peakStudentCount > 0 && (
              <span className="text-xs text-gray-400">/ {peakStudentCount} students</span>
            )}
          </div>
          {activeDiscussion && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => setAnalyticsOpen(true)}
            >
              View Analytics
            </Button>
          )}
        </div>
      </div>

      {isMC && activeDiscussion?.mc_options && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-semibold mb-2 text-gray-800">Options:</div>
          <div className="space-y-2 mb-4">
            {activeDiscussion.mc_options.map((opt) => (
              <div key={opt.label} className="text-xs">
                <span className="font-semibold mr-1">{opt.label}.</span>
                <span className={activeDiscussion.correct_option === opt.label ? 'font-bold text-green-700' : ''}>
                  {opt.text}
                </span>
                {activeDiscussion.correct_option === opt.label && (
                  <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Correct</span>
                )}
              </div>
            ))}
          </div>

          <div className="text-xs space-y-1 pt-3 border-t border-gray-200">
            <div className="font-semibold text-gray-700 mb-2">Student Responses</div>
            {Object.entries(distribution).map(([label, count]) => (
              <div key={label} className="flex justify-between items-center">
                <span>Option {label}:</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Waiting for student responses...
          </p>
        ) : (
          <div className="space-y-2 pr-2">
            {responses.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {r.response_text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Analytics modal */}
      <DiscussionAnalyticsModal
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        discussion={activeDiscussion ?? null}
        responses={responses}
        studentCount={peakStudentCount}
      />
    </aside>
  );
}