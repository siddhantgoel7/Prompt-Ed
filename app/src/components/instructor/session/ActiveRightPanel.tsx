'use client';

// Right panel of the active session view: live student responses and analytics.

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag } from 'lucide-react';
import type { Response } from '@/types/response';
import type { Discussion } from '@/types/discussion';
import { SessionContext } from './SessionContext';
import { DiscussionAnalyticsContent } from './DiscussionAnalyticsModal';

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

  // Track which response is selected/expanded
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [flaggingId, setFlaggingId] = React.useState<string | null>(null);

  // Clear selection when active discussion changes
  React.useEffect(() => {
    setSelectedId(null);
    setFlaggingId(null);
  }, [activeDiscussion?.id]);

  const handleFlagInappropriate = React.useCallback(async (responseId: string) => {
    if (!removeResponse) return;
    setFlaggingId(responseId);
    try {
      await removeResponse(responseId);
      setSelectedId(null);
    } catch (err) {
      console.error('Failed to flag response:', err);
    } finally {
      setFlaggingId(null);
    }
  }, [removeResponse]);

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

                {responses.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Waiting for student responses...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {responses.map((r) => {
                      const isSelected = selectedId === r.id;
                      const isBeingFlagged = flaggingId === r.id;

                      return (
                        <Card
                          key={r.id}
                          className={`cursor-pointer transition-all duration-300 ease-in-out ${
                            isSelected
                              ? 'border-2 border-black ring-4 ring-black/15 bg-yellow-50 shadow-xl z-10 relative my-4'
                              : 'shadow-sm border-gray-200 hover:border-gray-400'
                          }`}
                          onClick={() => setSelectedId(isSelected ? null : r.id)}
                        >
                          <CardContent className={`transition-all duration-300 ${isSelected ? 'p-6' : 'p-3'}`}>
                            <p className={`whitespace-pre-wrap break-words text-gray-800 transition-all duration-300 ${
                              isSelected ? 'text-2xl leading-relaxed font-semibold' : 'text-sm line-clamp-3'
                            }`}>
                              {r.response_text}
                            </p>
                            <p className={`text-gray-400 font-medium uppercase tracking-wider transition-all duration-300 ${
                              isSelected ? 'text-xs mt-4' : 'text-[10px] mt-1.5'
                            }`}>
                              {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>

                            {/* Expanded action bar — visible when response is selected */}
                            {isSelected && (
                              <div className="mt-4 pt-4 border-t border-gray-300 flex items-center justify-end animate-in fade-in slide-in-from-top-1 duration-200">
                                <button
                                  type="button"
                                  disabled={isBeingFlagged}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleFlagInappropriate(r.id);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Flag className="w-3 h-3" />
                                  {isBeingFlagged ? 'Removing...' : 'Flag as Inappropriate'}
                                </button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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