'use client';

// Right panel of the active session view: live student responses and analytics.

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { DiscussionAnalyticsContent } from './DiscussionAnalyticsModal';
import { useResponseSelection } from '@/hooks/useResponseSelection';
import { ResponseCard } from '@/components/instructor/ResponseCard';
import { FilterToggle } from '@/components/instructor/FilterToggle';

/** Displays live student responses and analytics for the active discussion. */
export function ActiveRightPanel(props: {
  responses?: Response[];
  activeDiscussion?: Discussion | null;
  studentCount?: number;
}) {
  const context = React.useContext(SessionContext);
  const responses = context ? context.responses : props.responses!;
  const activeDiscussion = context ? context.activeDiscussion : props.activeDiscussion!;
  const studentCount = context ? context.studentCount : (props.studentCount ?? 0);
  const removeResponse = context ? context.removeResponse : undefined;
  // Peak student count seen during the current discussion — only goes up, never down
  const peakStudentCount = context ? context.peakStudentCount : studentCount;

  const {
    selectedIds, flaggingId, showHighlightedOnly,
    toggleSelected, handleFlagInappropriate,
    setShowHighlightedOnly, resetSelection, filterResponses,
  } = useResponseSelection({
    onRemove: removeResponse ?? (async () => {}),
  });

  // Clear selection and filter when active discussion changes
  React.useEffect(() => { resetSelection(); }, [activeDiscussion?.id, resetSelection]);

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
    <aside className="w-96 lg:w-[450px] max-md:w-full border-l border-gray-300 flex flex-col bg-white">
      {/* Header row */}
      <div className="p-4 md:p-6 pb-0 mb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-gray-900">Live Responses</div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{responses.length}</span>
              {peakStudentCount > 0 && (
                <span className="text-xs text-gray-400">/ {peakStudentCount} students</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {!activeDiscussion ? (
        <div className="p-4 md:p-6 text-sm text-muted-foreground pt-8 text-center">
          No active discussion selected.
        </div>
      ) : (
        <Tabs defaultValue="list" className="flex flex-col flex-1 h-full overflow-hidden">
          <div className="px-4 md:px-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="list">List format</TabsTrigger>
              <TabsTrigger value="analytics">Metrics</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 mt-4">
            <div className="px-4 md:px-6 pb-6">
              <TabsContent value="list" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
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

                {/* Filter toggle — appears when responses are highlighted */}
                {selectedIds.length > 0 && responses.length > 0 && (
                  <div className="mb-3">
                    <FilterToggle
                      variant="compact"
                      selectedCount={selectedIds.length}
                      showHighlightedOnly={showHighlightedOnly}
                      onToggle={() => setShowHighlightedOnly(prev => !prev)}
                      onShowAll={() => setShowHighlightedOnly(false)}
                    />
                  </div>
                )}

                {responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Waiting for student responses...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filterResponses(responses).map((r) => (
                      <ResponseCard
                        key={r.id}
                        variant="compact"
                        responseText={r.response_text}
                        createdAt={r.created_at}
                        isSelected={selectedIds.includes(r.id)}
                        isBeingFlagged={flaggingId === r.id}
                        onToggle={() => toggleSelected(r.id)}
                        onFlag={() => void handleFlagInappropriate(r.id)}
                      />
                    ))}
                  </div>
                )}

              </TabsContent>

              <TabsContent value="analytics" className="mt-0 pt-2 focus-visible:outline-none focus-visible:ring-0">
                <DiscussionAnalyticsContent
                  discussion={activeDiscussion}
                  responses={responses}
                  studentCount={peakStudentCount}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      )}
    </aside>
  );
}